import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { UserDailyStreak } from '../entities/user-daily-streak.entity';
import { User } from '../entities/user.entity';
import { XpEvent } from '../entities/xp-event.entity';

@Injectable()
export class StreaksService implements OnModuleInit {
  private readonly logger = new Logger(StreaksService.name);

  constructor(
    @InjectRepository(UserDailyStreak)
    private streakRepository: Repository<UserDailyStreak>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(XpEvent)
    private xpEventRepository: Repository<XpEvent>,
  ) {}

  async onModuleInit() {
    // backfill streaks from existing XP events on startup
    this.logger.log('Backfilling daily streaks from existing XP events...');
    try {
      await this.backfillStreaksFromXpEvents();
      this.logger.log('Daily streak backfill complete');
    } catch (error) {
      this.logger.error('Failed to backfill streaks:', error);
    }
  }

  /**
   * Backfill streaks from existing XP events
   * Called once on startup
   */
  private async backfillStreaksFromXpEvents() {
    const users = await this.userRepository.find();

    for (const user of users) {
      const xpEvents = await this.xpEventRepository.find({
        where: { userId: user.id },
        order: { createdAt: 'ASC' },
      });

      if (xpEvents.length === 0) continue;

      // extract unique dates with activity
      const activeDates = new Set<string>();
      xpEvents.forEach((event) => {
        const dateStr = event.createdAt.toISOString().split('T')[0];
        activeDates.add(dateStr);
      });

      const sortedDates = Array.from(activeDates).sort();

      // calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let previousDate: Date | null = null;

      for (const dateStr of sortedDates) {
        const currentDate = new Date(dateStr);

        if (previousDate === null) {
          currentStreak = 1;
        } else {
          const daysDiff = Math.floor(
            (currentDate.getTime() - previousDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysDiff === 1) {
            currentStreak++;
          } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 1;
          }
        }

        previousDate = currentDate;
      }

      longestStreak = Math.max(longestStreak, currentStreak);

      // check if streak is still active (had activity today or yesterday)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastActivityDate = previousDate
        ? new Date(previousDate.toISOString().split('T')[0])
        : null;

      const isStreakActive =
        lastActivityDate &&
        (lastActivityDate.getTime() === today.getTime() ||
          lastActivityDate.getTime() === yesterday.getTime());

      let streak = await this.streakRepository.findOne({
        where: { userId: user.id },
      });

      if (!streak) {
        streak = this.streakRepository.create({
          userId: user.id,
          currentStreakDays: isStreakActive ? currentStreak : 0,
          longestStreakDays: longestStreak,
          lastActivityDate,
        });
      } else {
        streak.currentStreakDays = isStreakActive ? currentStreak : 0;
        streak.longestStreakDays = longestStreak;
        streak.lastActivityDate = lastActivityDate;
      }

      await this.streakRepository.save(streak);
    }
  }

  /**
   * Update streak when user completes an activity (creates XP event)
   */
  async updateStreakForXpEvent(userId: string) {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      streak = this.streakRepository.create({
        userId,
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActivityDate: new Date(),
      });
      return this.streakRepository.save(streak);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = streak.lastActivityDate
      ? new Date(streak.lastActivityDate)
      : null;
    lastActivity?.setHours(0, 0, 0, 0);

    // check if activity is today (same day)
    if (lastActivity && lastActivity.getTime() === today.getTime()) {
      // same day, no streak update needed
      return streak;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // check if activity is consecutive (yesterday)
    if (lastActivity && lastActivity.getTime() === yesterday.getTime()) {
      // consecutive day, continue streak
      streak.currentStreakDays += 1;
      streak.longestStreakDays = Math.max(
        streak.longestStreakDays,
        streak.currentStreakDays,
      );
    } else {
      // gap in streak, reset to 1
      streak.currentStreakDays = 1;
    }

    streak.lastActivityDate = today;
    return this.streakRepository.save(streak);
  }

  /**
   * Get user's streak info
   */
  async getUserStreak(userId: string) {
    let streak = await this.streakRepository.findOne({
      where: { userId },
    });

    if (!streak) {
      // create empty streak if doesn't exist
      streak = this.streakRepository.create({
        userId,
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActivityDate: null,
      });
      await this.streakRepository.save(streak);
    }

    return {
      userId,
      currentStreakDays: streak.currentStreakDays,
      longestStreakDays: streak.longestStreakDays,
      lastActivityDate: streak.lastActivityDate,
    };
  }

  /**
   * Get global leaderboard (top streaks)
   */
  async getStreakLeaderboard(limit: number = 10) {
    const topStreaks = await this.streakRepository.find({
      where: { longestStreakDays: MoreThanOrEqual(1) },
      relations: ['user'],
      order: { longestStreakDays: 'DESC' },
      take: limit,
    });

    return {
      limit,
      count: topStreaks.length,
      leaderboard: topStreaks.map((streak, index) => ({
        rank: index + 1,
        userId: streak.userId,
        userName: streak.user.displayName,
        longestStreakDays: streak.longestStreakDays,
        currentStreakDays: streak.currentStreakDays,
        lastActivityDate: streak.lastActivityDate,
      })),
    };
  }
}
