import { NotFoundException } from '@nestjs/common';

jest.mock('../common/s3.service', () => ({
  S3Service: class S3Service {},
}));

import { UsersService } from './users.service';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
};

const createRepoMock = (): RepoMock => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(async (payload) => payload),
});

describe('UsersService - XP and Level Scenarios', () => {
  let service: UsersService;

  let userRepository: RepoMock;
  let userPreferenceRepository: RepoMock;
  let userDailyStreakRepository: RepoMock;
  let xpEventRepository: RepoMock;
  let userBadgeRepository: RepoMock;
  let certificateRepository: RepoMock;
  let enrollmentRepository: RepoMock;
  let s3Service: { uploadFile: jest.Mock };

  beforeEach(() => {
    userRepository = createRepoMock();
    userPreferenceRepository = createRepoMock();
    userDailyStreakRepository = createRepoMock();
    xpEventRepository = createRepoMock();
    userBadgeRepository = createRepoMock();
    certificateRepository = createRepoMock();
    enrollmentRepository = createRepoMock();
    s3Service = { uploadFile: jest.fn() };

    service = new UsersService(
      userRepository as any,
      userPreferenceRepository as any,
      userDailyStreakRepository as any,
      xpEventRepository as any,
      userBadgeRepository as any,
      certificateRepository as any,
      enrollmentRepository as any,
      s3Service as any,
    );
  });

  it('TC-USER-POS-001 should increase level and activity summary when XP events increase', async () => {
    const userId = 'user-1';

    userRepository.findOne.mockResolvedValue({
      id: userId,
      displayName: 'Learner',
      avatarS3Key: null,
      bio: 'bio',
    });

    xpEventRepository.find.mockResolvedValue([
      {
        points: 400,
        createdAt: new Date('2026-05-10T01:00:00.000Z'),
      },
      {
        points: 300,
        createdAt: new Date('2026-05-10T03:00:00.000Z'),
      },
      {
        points: 200,
        createdAt: new Date('2026-05-11T01:00:00.000Z'),
      },
    ]);

    userDailyStreakRepository.findOne.mockResolvedValue({
      currentStreakDays: 2,
    });
    userBadgeRepository.find.mockResolvedValue([]);
    enrollmentRepository.find.mockResolvedValue([]);
    certificateRepository.find.mockResolvedValue([]);

    const result = await service.getPublicProfile(userId);

    expect(result.totalXp).toBe(900);
    expect(result.level).toBeGreaterThan(1);
    expect(result.recentActivity).toHaveLength(2);
    expect(result.recentActivity).toEqual([
      {
        createdAt: '2026-05-10',
        eventCount: 2,
        totalPoints: 700,
      },
      {
        createdAt: '2026-05-11',
        eventCount: 1,
        totalPoints: 200,
      },
    ]);
  });

  it('TC-USER-NEG-001 should throw when user does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.getPublicProfile('missing-user')).rejects.toThrow(
      NotFoundException,
    );
  });
});

