import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from '../entities/user.entity';
import {XpEvent} from '../entities/xp-event.entity';
import {UserDailyStreak} from '../entities/user-daily-streak.entity';
import {calculateLevel} from '../common/utils/level-calculator';
import {LeaderboardPeriod} from './dto/get-global-leaderboard.dto';

type LeaderboardRow = {
    rank: number;
    userId: string;
    displayName: string;
    avatarS3Key: string | null;
    score: number;
    xpPoints: number;
    currentStreakDays: number;
    longestStreakDays: number;
    level: number;
};

const GLOBAL_LEADERBOARD_MAX_ENTRIES = 100;

@Injectable()
export class LeaderboardsService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(XpEvent)
        private xpEventRepository: Repository<XpEvent>,
        @InjectRepository(UserDailyStreak)
        private streakRepository: Repository<UserDailyStreak>,
    ) {
    }

    async getPublicGlobalLeaderboard(period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME) {
        const data = await this.buildGlobalLeaderboard(period);
        const visibleRows = data.rows.slice(0, GLOBAL_LEADERBOARD_MAX_ENTRIES);
        return {
            period,
            generatedAt: new Date().toISOString(),
            ...(data.windowMeta ?? {}),
            count: Math.min(5, visibleRows.length),
            leaderboard: visibleRows.slice(0, 5),
        };
    }

    async getGlobalLeaderboard(
        userId: string,
        period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
        limit = 20,
        lastId?: string,
    ) {
        const safeLimit = Math.min(100, Math.max(1, limit));
        const data = await this.buildGlobalLeaderboard(period);
        const totalParticipants = data.rows.length;
        const visibleRows = data.rows.slice(0, GLOBAL_LEADERBOARD_MAX_ENTRIES);
        const total = visibleRows.length;
        const start = this.resolveCursorStartIndex(visibleRows, lastId);
        const paged = visibleRows.slice(start, start + safeLimit);
        const hasMore = start + safeLimit < visibleRows.length;
        const nextLastId = hasMore && paged.length > 0 ? paged[paged.length - 1].userId : null;

        return {
            period,
            generatedAt: new Date().toISOString(),
            ...(data.windowMeta ?? {}),
            maxEntries: GLOBAL_LEADERBOARD_MAX_ENTRIES,
            limit: safeLimit,
            lastId: lastId ?? null,
            nextLastId,
            hasMore,
            total,
            totalParticipants,
            count: paged.length,
            leaderboard: paged,
            myRank: data.rows.find((r) => r.userId === userId) ?? null,
        };
    }

    private async buildGlobalLeaderboard(period: LeaderboardPeriod): Promise<{
        rows: LeaderboardRow[];
        windowMeta?: Record<string, string | number>;
    }> {
        if (period === LeaderboardPeriod.WEEKLY) {
            const {weekStart, weekEnd, resetInSeconds} = this.getCurrentWeekUtcWindow();
            const rows = await this.buildWeeklyRows(weekStart, weekEnd);
            return {
                rows: this.rankRows(rows),
                windowMeta: {
                    weekStartUtc: weekStart.toISOString(),
                    weekEndUtc: weekEnd.toISOString(),
                    resetInSeconds,
                },
            };
        }

        const rows = await this.buildAllTimeRows();
        return {rows: this.rankRows(rows)};
    }

    private async buildAllTimeRows(): Promise<Omit<LeaderboardRow, 'rank'>[]> {
        const users = await this.userRepository.find({
            where: {isActive: true},
            select: ['id', 'displayName', 'avatarS3Key'],
        });

        if (users.length === 0) return [];

        const xpRows = await this.xpEventRepository
            .createQueryBuilder('xp')
            .select('xp.userId', 'userId')
            .addSelect('COALESCE(SUM(xp.points), 0)', 'xpPoints')
            .groupBy('xp.userId')
            .getRawMany<{ userId: string; xpPoints: string }>();

        const streakRows = await this.streakRepository.find();

        const xpByUser = new Map<string, number>();
        for (const row of xpRows) xpByUser.set(row.userId, Number(row.xpPoints) || 0);

        const streakByUser = new Map<string, UserDailyStreak>();
        for (const row of streakRows) streakByUser.set(row.userId, row);

        return users
            .map((user) => {
                const xpPoints = xpByUser.get(user.id) ?? 0;
                const streak = streakByUser.get(user.id);
                const currentStreakDays = streak?.currentStreakDays ?? 0;
                const longestStreakDays = streak?.longestStreakDays ?? 0;
                const score = xpPoints + currentStreakDays * 50 + longestStreakDays * 20;
                return {
                    userId: user.id,
                    displayName: user.displayName,
                    avatarS3Key: user.avatarS3Key ?? null,
                    score,
                    xpPoints,
                    currentStreakDays,
                    longestStreakDays,
                    level: calculateLevel(xpPoints),
                };
            })
            .filter((row) => row.score > 0);
    }

    private async buildWeeklyRows(
        weekStart: Date,
        weekEnd: Date,
    ): Promise<Omit<LeaderboardRow, 'rank'>[]> {
        const users = await this.userRepository.find({
            where: {isActive: true},
            select: ['id', 'displayName', 'avatarS3Key'],
        });

        if (users.length === 0) return [];

        const xpRows = await this.xpEventRepository
            .createQueryBuilder('xp')
            .select('xp.userId', 'userId')
            .addSelect('COALESCE(SUM(xp.points), 0)', 'xpPoints')
            .where('xp.createdAt >= :weekStart', {weekStart: weekStart.toISOString()})
            .andWhere('xp.createdAt < :weekEnd', {weekEnd: weekEnd.toISOString()})
            .groupBy('xp.userId')
            .getRawMany<{ userId: string; xpPoints: string }>();

        const allTimeXpRows = await this.xpEventRepository
            .createQueryBuilder('xp')
            .select('xp.userId', 'userId')
            .addSelect('COALESCE(SUM(xp.points), 0)', 'xpPoints')
            .groupBy('xp.userId')
            .getRawMany<{ userId: string; xpPoints: string }>();

        const activeDateRows = await this.xpEventRepository
            .createQueryBuilder('xp')
            .select('xp.userId', 'userId')
            .addSelect(`DATE(xp.createdAt)`, 'activeDate')
            .where('xp.createdAt >= :weekStart', {weekStart: weekStart.toISOString()})
            .andWhere('xp.createdAt < :weekEnd', {weekEnd: weekEnd.toISOString()})
            .groupBy('xp.userId')
            .addGroupBy(`DATE(xp.createdAt)`)
            .orderBy('xp.userId', 'ASC')
            .addOrderBy(`DATE(xp.createdAt)`, 'ASC')
            .getRawMany<{ userId: string; activeDate: string }>();

        const xpByUser = new Map<string, number>();
        for (const row of xpRows) xpByUser.set(row.userId, Number(row.xpPoints) || 0);

        const allTimeXpByUser = new Map<string, number>();
        for (const row of allTimeXpRows) {
            allTimeXpByUser.set(row.userId, Number(row.xpPoints) || 0);
        }

        const datesByUser = new Map<string, Date[]>();
        for (const row of activeDateRows) {
            const list = datesByUser.get(row.userId) ?? [];
            const date = this.parseActiveDate(row.activeDate);
            if (date) list.push(date);
            datesByUser.set(row.userId, list);
        }

        return users
            .map((user) => {
                const xpPoints = xpByUser.get(user.id) ?? 0;
                const userDates = datesByUser.get(user.id) ?? [];
                const {currentStreakDays, longestStreakDays} = this.calculateStreakFromDates(userDates);
                const score = xpPoints + currentStreakDays * 50 + longestStreakDays * 20;
                const allTimeXp = allTimeXpByUser.get(user.id) ?? 0;
                return {
                    userId: user.id,
                    displayName: user.displayName,
                    avatarS3Key: user.avatarS3Key ?? null,
                    score,
                    xpPoints,
                    currentStreakDays,
                    longestStreakDays,
                    level: calculateLevel(allTimeXp),
                };
            })
            .filter((row) => row.score > 0);
    }

    private rankRows(rows: Omit<LeaderboardRow, 'rank'>[]): LeaderboardRow[] {
        const sorted = [...rows].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.xpPoints !== a.xpPoints) return b.xpPoints - a.xpPoints;
            if (b.longestStreakDays !== a.longestStreakDays) {
                return b.longestStreakDays - a.longestStreakDays;
            }
            return a.userId.localeCompare(b.userId);
        });

        return sorted.map((row, index) => ({
            rank: index + 1,
            ...row,
        }));
    }

    private calculateStreakFromDates(dates: Date[]) {
        if (dates.length === 0) {
            return {currentStreakDays: 0, longestStreakDays: 0};
        }

        const unique = Array.from(new Set(dates.map((d) => d.toISOString().slice(0, 10))))
            .map((s) => new Date(`${s}T00:00:00.000Z`))
            .sort((a, b) => a.getTime() - b.getTime());

        let longest = 1;
        let run = 1;
        for (let i = 1; i < unique.length; i++) {
            const diffDays = Math.round((unique[i].getTime() - unique[i - 1].getTime()) / 86400000);
            if (diffDays === 1) {
                run += 1;
            } else {
                longest = Math.max(longest, run);
                run = 1;
            }
        }
        longest = Math.max(longest, run);

        let current = 1;
        for (let i = unique.length - 1; i > 0; i--) {
            const diffDays = Math.round((unique[i].getTime() - unique[i - 1].getTime()) / 86400000);
            if (diffDays === 1) current += 1;
            else break;
        }

        return {
            currentStreakDays: current,
            longestStreakDays: longest,
        };
    }

    private parseActiveDate(value: unknown): Date | null {
        if (value instanceof Date) {
            if (Number.isNaN(value.getTime())) return null;
            return new Date(
                Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
            );
        }

        if (typeof value === 'string') {
            const dayString = value.slice(0, 10);
            const parsed = new Date(`${dayString}T00:00:00.000Z`);
            if (Number.isNaN(parsed.getTime())) return null;
            return parsed;
        }

        return null;
    }

    private resolveCursorStartIndex(rows: LeaderboardRow[], lastId?: string): number {
        if (!lastId) return 0;
        const idx = rows.findIndex((row) => row.userId === lastId);
        if (idx === -1) return 0;
        return idx + 1;
    }

    private getCurrentWeekUtcWindow() {
        const now = new Date();
        const day = now.getUTCDay();
        const daysSinceMonday = (day + 6) % 7;

        const weekStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - daysSinceMonday,
            0,
            0,
            0,
            0,
        ));
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

        const resetInSeconds = Math.max(0, Math.floor((weekEnd.getTime() - now.getTime()) / 1000));

        return {weekStart, weekEnd, resetInSeconds};
    }
}
