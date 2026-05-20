import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { UserDailyStreak } from '../entities/user-daily-streak.entity';
import { XpEvent } from '../entities/xp-event.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Certificate } from '../entities/certificate.entity';
import { Enrollment } from '../entities/progress/enrollment.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { calculateLevel, getLevelInfo } from '../common/utils/level-calculator';
import { S3Service } from '../common/s3.service';
import * as path from 'path';
import {assertUploadedFileAllowed} from '../common/upload-limits';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    @InjectRepository(UserDailyStreak)
    private userDailyStreakRepository: Repository<UserDailyStreak>,
    @InjectRepository(XpEvent)
    private xpEventRepository: Repository<XpEvent>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    private s3Service: S3Service,
  ) {}

  async getPublicProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // get XP events for total XP and activity summary
    const xpEvents = await this.xpEventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const totalXp = xpEvents.reduce((sum, event) => sum + event.points, 0);
    const level = calculateLevel(totalXp);

    const streak = await this.userDailyStreakRepository.findOne({
      where: { userId },
    });
    const currentStreak = streak?.currentStreakDays || 0;

    const userBadges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { awardedAt: 'DESC' },
    });

    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'courseProgress'],
    });

    const enrolledCourses = enrollments.map((enrollment) => ({
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      courseSlug: enrollment.course.slug,
      courseLevel: enrollment.course.level,
      enrolledAt: enrollment.enrolledAt,
      status: enrollment.status,
      progress: enrollment.courseProgress
        ? {
            completedUnits: enrollment.courseProgress.completedUnits,
            totalUnits: enrollment.courseProgress.totalUnits,
            progressPercent: enrollment.courseProgress.progressPercent,
          }
        : null,
    }));

    const certificates = await this.certificateRepository.find({
      where: { userId },
      relations: ['course'],
      order: { issuedAt: 'DESC' },
    });

    // privacy/perf: summarize activity by day (last 6 months)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 182);
    const activityMap = new Map<
      string,
      { createdAt: string; eventCount: number; totalPoints: number }
    >();

    for (const event of xpEvents) {
      if (event.createdAt < cutoff) continue;
      const dateKey = event.createdAt.toISOString().slice(0, 10);
      const existing = activityMap.get(dateKey);
      if (existing) {
        existing.eventCount += 1;
        existing.totalPoints += event.points;
      } else {
        activityMap.set(dateKey, {
          createdAt: dateKey,
          eventCount: 1,
          totalPoints: event.points,
        });
      }
    }

    const recentActivity = Array.from(activityMap.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );

    return {
      id: user.id,
      displayName: user.displayName,
      avatarS3Key: user.avatarS3Key,
      bio: user.bio,
      level,
      totalXp,
      currentStreak,
      badges: userBadges.map((ub) => ({
        badgeId: ub.badge.id,
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        iconS3Key: ub.badge.iconS3Key,
        awardedAt: ub.awardedAt,
      })),
      enrolledCourses,
      certificates: certificates.map((cert) => ({
        certificateId: cert.id,
        certificateCode: cert.certificateCode,
        courseName: cert.course.title,
        issuedAt: cert.issuedAt,
        pdfS3Key: cert.pdfS3Key,
      })),
      recentActivity,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'roles',
        'preference',
        'userBadges',
        'userBadges.badge',
        'xpEvents',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalXp = user.xpEvents
      ? user.xpEvents.reduce((sum, event) => sum + event.points, 0)
      : 0;

    const level = calculateLevel(totalXp);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarS3Key: user.avatarS3Key,
      bio: user.bio,
      level,
      totalXp,
      roles: user.roles.map((r) => r.role),
      preference: user.preference,
      badges: user.userBadges
        ? user.userBadges.map((ub) => ({
            badgeId: ub.badge.id,
            code: ub.badge.code,
            name: ub.badge.name,
            description: ub.badge.description,
            iconS3Key: ub.badge.iconS3Key,
            awardedAt: ub.awardedAt,
          }))
        : [],
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    avatarFile?: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }

      user.email = updateProfileDto.email;
    }

    if (updateProfileDto.displayName !== undefined) {
      user.displayName = updateProfileDto.displayName;
    }

    if (updateProfileDto.bio !== undefined) {
      user.bio = updateProfileDto.bio;
    }

    if (avatarFile) {
      try {
        await assertUploadedFileAllowed(avatarFile, 'image');
        // format: {userId}-{timestamp}.ext (e.g., 550e8400-xxx-1713001383000.jpg)
        const ext = path.extname(avatarFile.originalname);
        const timestamp = Date.now();
        const fileName = `${user.id}-${timestamp}${ext}`;

        // upload to S3
        const s3Key = await this.s3Service.uploadFile(
          avatarFile.buffer,
          avatarFile.mimetype,
          'avatars',
          fileName,
        );

        user.avatarS3Key = s3Key;
      } catch (error) {
        throw new InternalServerErrorException(
          `Failed to upload avatar: ${error.message}`,
        );
      }
    }

    try {
      const updatedUser = await this.userRepository.save(user);
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        avatarS3Key: updatedUser.avatarS3Key,
        bio: updatedUser.bio,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ) {
    const preferences = await this.userPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      throw new NotFoundException('User preferences not found');
    }

    if (updatePreferencesDto.darkModeEnabled !== undefined) {
      preferences.darkModeEnabled = updatePreferencesDto.darkModeEnabled;
    }

    if (updatePreferencesDto.preferredLocale !== undefined) {
      preferences.preferredLocale = updatePreferencesDto.preferredLocale;
    }

    try {
      const updatedPreferences =
        await this.userPreferenceRepository.save(preferences);
      return {
        userId: updatedPreferences.userId,
        darkModeEnabled: updatedPreferences.darkModeEnabled,
        preferredLocale: updatedPreferences.preferredLocale,
        updatedAt: updatedPreferences.updatedAt,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to update preferences');
    }
  }

  async getXpSummary(userId: string) {
    const xpEvents = await this.xpEventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const totalXp = xpEvents.reduce((sum, event) => sum + event.points, 0);

    const levelInfo = getLevelInfo(totalXp);

    const byEventType = xpEvents.reduce(
      (acc, event) => {
        if (!acc[event.eventType]) {
          acc[event.eventType] = 0;
        }
        acc[event.eventType] += event.points;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      userId,
      ...levelInfo,
      byEventType,
      recentEvents: xpEvents.slice(0, 10).map((event) => ({
        eventType: event.eventType,
        points: event.points,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        createdAt: event.createdAt,
      })),
    };
  }

  async getBadges(userId: string) {
    const userBadges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { awardedAt: 'DESC' },
    });

    return {
      userId,
      totalBadges: userBadges.length,
      badges: userBadges.map((ub) => ({
        badgeId: ub.badge.id,
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        iconS3Key: ub.badge.iconS3Key,
        awardedAt: ub.awardedAt,
      })),
    };
  }
}
