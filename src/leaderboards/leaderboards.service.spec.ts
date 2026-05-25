import {LeaderboardsService} from './leaderboards.service';
import {LeaderboardPeriod} from './dto/get-global-leaderboard.dto';

type RepoMock = {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
};

const createRepoMock = (): RepoMock => ({
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
});

const createQbMock = (rows: any[]) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
});

describe('LeaderboardsService', () => {
    let service: LeaderboardsService;
    let userRepository: RepoMock;
    let xpEventRepository: RepoMock;
    let streakRepository: RepoMock;

    beforeEach(() => {
        userRepository = createRepoMock();
        xpEventRepository = createRepoMock();
        streakRepository = createRepoMock();

        service = new LeaderboardsService(
            userRepository as any,
            xpEventRepository as any,
            streakRepository as any,
        );
    });

    it('ranks all-time leaderboard with balanced score and tie-breaks', async () => {
        userRepository.find.mockResolvedValue([
            {id: 'u1', displayName: 'Alice', avatarS3Key: null},
            {id: 'u2', displayName: 'Bob', avatarS3Key: null},
            {id: 'u3', displayName: 'Cecil', avatarS3Key: null},
        ]);

        xpEventRepository.createQueryBuilder.mockReturnValueOnce(
            createQbMock([
                {userId: 'u1', xpPoints: '1000'},
                {userId: 'u2', xpPoints: '1000'},
                {userId: 'u3', xpPoints: '500'},
            ]),
        );

        streakRepository.find.mockResolvedValue([
            {userId: 'u1', currentStreakDays: 3, longestStreakDays: 4},
            {userId: 'u2', currentStreakDays: 1, longestStreakDays: 1},
            {userId: 'u3', currentStreakDays: 10, longestStreakDays: 10},
        ]);

        const result = await service.getGlobalLeaderboard(
            'u3',
            LeaderboardPeriod.ALL_TIME,
            10,
            undefined,
        );

        expect(result.total).toBe(3);
        expect(result.leaderboard[0].userId).toBe('u1');
        expect(result.leaderboard[1].userId).toBe('u3');
        expect(result.myRank?.userId).toBe('u3');
        expect(result.myRank?.rank).toBe(2);
    });

    it('returns top 5 only for public leaderboard', async () => {
        const users = Array.from({length: 6}, (_, i) => ({
            id: `u${i + 1}`,
            displayName: `U${i + 1}`,
            avatarS3Key: null,
        }));
        userRepository.find.mockResolvedValue(users);
        xpEventRepository.createQueryBuilder.mockReturnValueOnce(
            createQbMock(
                users.map((u, i) => ({userId: u.id, xpPoints: String((6 - i) * 100)})),
            ),
        );
        streakRepository.find.mockResolvedValue([]);

        const result = await service.getPublicGlobalLeaderboard(LeaderboardPeriod.ALL_TIME);
        expect(result.count).toBe(5);
        expect(result.leaderboard).toHaveLength(5);
    });

    it('uses all-time XP for level in weekly period and handles date-like activeDate rows', async () => {
        userRepository.find.mockResolvedValue([
            {id: 'u1', displayName: 'Alice', avatarS3Key: null},
        ]);

        xpEventRepository.createQueryBuilder
            .mockReturnValueOnce(
                createQbMock([
                    // weekly xp
                    {userId: 'u1', xpPoints: '200'},
                ]),
            )
            .mockReturnValueOnce(
                createQbMock([
                    // all-time xp
                    {userId: 'u1', xpPoints: '1200'},
                ]),
            )
            .mockReturnValueOnce(
                createQbMock([
                    // active dates from DB; emulate Date object shape
                    {userId: 'u1', activeDate: new Date('2026-05-26T00:00:00.000Z')},
                ]),
            );

        const result = await service.getGlobalLeaderboard(
            'u1',
            LeaderboardPeriod.WEEKLY,
            10,
            undefined,
        );

        expect(result.leaderboard).toHaveLength(1);
        // level 6 requires > 674 cumulative XP, so 1200 must be higher than weekly 200 level.
        expect(result.leaderboard[0].level).toBeGreaterThan(2);
        expect(result.myRank?.userId).toBe('u1');
    });

    it('excludes zero-activity users and caps visible leaderboard to top 100 while keeping myRank', async () => {
        const users = Array.from({length: 102}, (_, i) => ({
            id: `u${i + 1}`,
            displayName: `U${i + 1}`,
            avatarS3Key: null,
        }));
        userRepository.find.mockResolvedValue(users);

        const xpRows = users.slice(0, 101).map((u, i) => ({
            userId: u.id,
            xpPoints: String(1000 - i),
        }));
        xpEventRepository.createQueryBuilder.mockReturnValueOnce(createQbMock(xpRows));
        streakRepository.find.mockResolvedValue([]);

        const result = await service.getGlobalLeaderboard(
            'u101',
            LeaderboardPeriod.ALL_TIME,
            100,
            undefined,
        );

        expect(result.totalParticipants).toBe(101);
        expect(result.total).toBe(100);
        expect(result.maxEntries).toBe(100);
        expect(result.leaderboard).toHaveLength(100);
        expect(result.myRank?.userId).toBe('u101');
        expect(result.myRank?.rank).toBe(101);
    });

    it('supports cursor pagination with lastId and returns nextLastId', async () => {
        const users = Array.from({length: 5}, (_, i) => ({
            id: `u${i + 1}`,
            displayName: `U${i + 1}`,
            avatarS3Key: null,
        }));
        userRepository.find.mockResolvedValue(users);
        xpEventRepository.createQueryBuilder.mockImplementation(() =>
            createQbMock(
                users.map((u, i) => ({userId: u.id, xpPoints: String(500 - i * 10)})),
            ),
        );
        streakRepository.find.mockResolvedValue([]);

        const first = await service.getGlobalLeaderboard(
            'u1',
            LeaderboardPeriod.ALL_TIME,
            2,
            undefined,
        );
        expect(first.leaderboard).toHaveLength(2);
        expect(first.hasMore).toBe(true);
        expect(first.nextLastId).toBe(first.leaderboard[1].userId);

        const second = await service.getGlobalLeaderboard(
            'u1',
            LeaderboardPeriod.ALL_TIME,
            2,
            first.nextLastId ?? undefined,
        );
        expect(second.leaderboard).toHaveLength(2);
        expect(second.leaderboard[0].rank).toBe(3);
    });
});
