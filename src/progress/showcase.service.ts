import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicShowcase } from '../entities/public-showcase.entity';
import { Course } from '../entities/course/course.entity';
import { Certificate } from '../entities/certificate.entity';
import { CreateShowcaseDto, UpdateShowcaseDto } from './dto/showcase.dto';
import {removeUndefinedProperties} from '../common/utils/object';

// re-export DTOs for backward compatibility
export { CreateShowcaseDto, UpdateShowcaseDto };

export interface ShowcaseResponse {
    id: string;
    userId: string;
    courseId: string;
    certificateId: string | null;
    title: string;
    description: string | null;
    projectUrl: string | null;
    isPublic: boolean;
    createdAt: Date;
    user?: {
        id: string;
        displayName: string;
        avatarS3Key: string | null;
    };
    course?: {
        id: string;
        title: string;
        slug: string;
        level: string;
        thumbnailS3Key: string | null;
    };
}

@Injectable()
export class ShowcaseService {
  constructor(
    @InjectRepository(PublicShowcase)
    private showcaseRepository: Repository<PublicShowcase>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
  ) {}

  /**
   * Create a new showcase for a course
   */
  async createShowcase(
    userId: string,
    courseId: string,
    createShowcaseDto: CreateShowcaseDto,
  ): Promise<ShowcaseResponse> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existing = await this.showcaseRepository.findOne({
      where: { userId, courseId },
    });

    if (existing) {
      throw new ConflictException(
        'You already have a showcase for this course',
      );
    }

    // validate certificate if provided
    let certificateId: string | null = null;
    if (createShowcaseDto.certificateId) {
      const cert = await this.certificateRepository.findOne({
        where: { id: createShowcaseDto.certificateId, userId },
      });

      if (!cert) {
        throw new NotFoundException(
          'Certificate not found or does not belong to you',
        );
      }
      certificateId = createShowcaseDto.certificateId;
    }

    const showcase = this.showcaseRepository.create({
      userId,
      courseId,
      certificateId,
      title: createShowcaseDto.title,
      description: createShowcaseDto.description,
      projectUrl: createShowcaseDto.projectUrl,
      isPublic: createShowcaseDto.isPublic ?? true,
    });

      const saved = await this.showcaseRepository.save(showcase);
      return this.toShowcaseResponse(saved);
  }

  /**
   * Get user's own showcase
   */
  async getUserShowcase(
    userId: string,
    showcaseId: string,
  ): Promise<ShowcaseResponse> {
    const showcase = await this.showcaseRepository.findOne({
      where: { id: showcaseId, userId },
      relations: ['user', 'course'],
    });

    if (!showcase) {
      throw new NotFoundException('Showcase not found');
    }

      return this.toShowcaseResponse(showcase);
  }

  /**
   * Get all public showcases (pagination)
   */
  async getPublicShowcases(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
      data: ShowcaseResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [showcases, total] = await this.showcaseRepository.findAndCount({
      where: { isPublic: true },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

      return {
          data: showcases.map((showcase) => this.toShowcaseResponse(showcase)),
          total,
          page,
          limit,
      };
  }

  /**
   * Get showcases for a specific user (public ones only, unless viewing own)
   */
  async getUserShowcases(
    userId: string,
    viewingUserId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
      data: ShowcaseResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const isOwnProfile = userId === viewingUserId;

    const [showcases, total] = await this.showcaseRepository.findAndCount({
      where: isOwnProfile ? { userId } : { userId, isPublic: true },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

      return {
          data: showcases.map((showcase) => this.toShowcaseResponse(showcase)),
          total,
          page,
          limit,
      };
  }

  /**
   * Get showcases for a specific course (public only)
   */
  async getCourseShowcases(
    courseId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
      data: ShowcaseResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [showcases, total] = await this.showcaseRepository.findAndCount({
      where: { courseId, isPublic: true },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

      return {
          data: showcases.map((showcase) => this.toShowcaseResponse(showcase)),
          total,
          page,
          limit,
      };
  }

  /**
   * Update showcase
   */
  async updateShowcase(
    userId: string,
    showcaseId: string,
    updateShowcaseDto: UpdateShowcaseDto,
  ): Promise<ShowcaseResponse> {
    const showcase = await this.showcaseRepository.findOne({
      where: { id: showcaseId, userId },
    });

    if (!showcase) {
      throw new NotFoundException('Showcase not found');
    }

    Object.assign(showcase, removeUndefinedProperties(updateShowcaseDto));
      const saved = await this.showcaseRepository.save(showcase);
      return this.toShowcaseResponse(saved);
  }

  /**
   * Delete showcase
   */
  async deleteShowcase(userId: string, showcaseId: string): Promise<void> {
    const showcase = await this.showcaseRepository.findOne({
      where: { id: showcaseId, userId },
    });

    if (!showcase) {
      throw new NotFoundException('Showcase not found');
    }

    await this.showcaseRepository.remove(showcase);
  }

    private toShowcaseResponse(showcase: PublicShowcase): ShowcaseResponse {
        return {
            id: showcase.id,
            userId: showcase.userId,
            courseId: showcase.courseId,
            certificateId: showcase.certificateId,
            title: showcase.title,
            description: showcase.description,
            projectUrl: showcase.projectUrl,
            isPublic: showcase.isPublic,
            createdAt: showcase.createdAt,
            user: showcase.user
                ? {
                    id: showcase.user.id,
                    displayName: showcase.user.displayName,
                    avatarS3Key: showcase.user.avatarS3Key,
                }
                : undefined,
            course: showcase.course
                ? {
                    id: showcase.course.id,
                    title: showcase.course.title,
                    slug: showcase.course.slug,
                    level: showcase.course.level,
                    thumbnailS3Key: showcase.course.thumbnailS3Key,
                }
                : undefined,
        };
    }
}
