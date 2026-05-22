import { BadRequestException } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { UnitType } from '../entities/course/unit.entity';
import { UnitProgressStatus } from '../entities/progress/unit-progress.entity';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

const createRepoMock = (): RepoMock => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  create: jest.fn((payload) => payload),
  save: jest.fn(async (payload) => payload),
});

describe('ProgressService - Unit-by-Unit Course Flow', () => {
  let service: ProgressService;
  let enrollmentRepository: RepoMock;
  let courseProgressRepository: RepoMock;
  let unitProgressRepository: RepoMock;
  let courseRepository: RepoMock;
  let unitRepository: RepoMock;
  let unitPrerequisiteRepository: RepoMock;
  let xpEventRepository: RepoMock;
  let badgesService: { checkAndAwardXpMilestones: jest.Mock };

  beforeEach(() => {
    enrollmentRepository = createRepoMock();
    courseProgressRepository = createRepoMock();
    unitProgressRepository = createRepoMock();
    courseRepository = createRepoMock();
    unitRepository = createRepoMock();
    unitPrerequisiteRepository = createRepoMock();
    xpEventRepository = createRepoMock();
    badgesService = { checkAndAwardXpMilestones: jest.fn() };

    service = new ProgressService(
      enrollmentRepository as any,
      courseProgressRepository as any,
      unitProgressRepository as any,
      courseRepository as any,
      unitRepository as any,
      unitPrerequisiteRepository as any,
      xpEventRepository as any,
      badgesService as any,
    );
  });

  it('TC-COURSE-POS-UNIT-001 should complete module unit manually and award XP', async () => {
    const userId = 'user-1';
    const unitId = 'u-module';
    const courseId = 'course-1';
    const progress = {
      userId,
      unitId,
      status: UnitProgressStatus.IN_PROGRESS,
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    unitRepository.findOne.mockResolvedValue({
      id: unitId,
      courseId,
      title: 'Module 1',
      type: UnitType.MODULE,
      isPublished: true,
    });
    unitProgressRepository.findOne.mockResolvedValue(progress);
    unitRepository.find.mockResolvedValue([
      { id: 'u-module' },
      { id: 'u-exercise' },
      { id: 'u-assessment' },
      { id: 'u-final' },
    ]);
    unitProgressRepository.count.mockResolvedValue(1);
    courseProgressRepository.findOne.mockResolvedValue({
      userId,
      courseId,
      totalUnits: 4,
    });
    unitPrerequisiteRepository.find.mockResolvedValue([]);
    xpEventRepository.find.mockResolvedValue([
      {points: 200},
      {points: 100},
    ]);

    const result = await service.completeUnit(userId, unitId);

    expect(result.success).toBe(true);
    expect(result.status).toBe(UnitProgressStatus.COMPLETED);
    expect(xpEventRepository.save).toHaveBeenCalledTimes(1);
    expect(badgesService.checkAndAwardXpMilestones).toHaveBeenCalledWith(
      userId,
      300,
    );
  });

  it('TC-COURSE-POS-UNIT-002 should auto-complete exercise unit from passing submission', async () => {
    const userId = 'user-1';
    const unitId = 'u-exercise';
    const courseId = 'course-1';

    unitRepository.findOne.mockResolvedValue({
      id: unitId,
      courseId,
      title: 'Exercise 1',
      type: UnitType.EXERCISE,
      isPublished: true,
    });
    unitProgressRepository.findOne.mockResolvedValue({
      userId,
      unitId,
      status: UnitProgressStatus.AVAILABLE,
      startedAt: null,
    });
    unitRepository.find.mockResolvedValue([
      { id: 'u-module' },
      { id: 'u-exercise' },
      { id: 'u-assessment' },
      { id: 'u-final' },
    ]);
    unitProgressRepository.count.mockResolvedValue(2);
    courseProgressRepository.findOne.mockResolvedValue({
      userId,
      courseId,
      totalUnits: 4,
    });
    unitPrerequisiteRepository.find.mockResolvedValue([]);

    await service.completeExerciseUnitBySubmission(
      userId,
      unitId,
      'submission-1',
      100,
    );

    expect(unitProgressRepository.save).toHaveBeenCalled();
    expect(xpEventRepository.save).toHaveBeenCalledTimes(1);
  });

  it('TC-COURSE-NEG-UNIT-003 should not complete assessment unit when score is below 100%', async () => {
    const userId = 'user-1';
    const unitId = 'u-assessment';

    unitRepository.findOne.mockResolvedValue({
      id: unitId,
      courseId: 'course-1',
      title: 'Assessment 1',
      type: UnitType.ASSESSMENT,
      isPublished: true,
    });

    await service.completeQuizUnitBySubmission(
      userId,
      unitId,
      'quiz-attempt-1',
      80,
    );

    expect(unitProgressRepository.findOne).not.toHaveBeenCalled();
    expect(xpEventRepository.save).not.toHaveBeenCalled();
  });

  it('TC-COURSE-DES-UNIT-004 should reject manual completion for final exam unit type', async () => {
    unitRepository.findOne.mockResolvedValue({
      id: 'u-final',
      courseId: 'course-1',
      title: 'Final Exam',
      type: UnitType.FINAL_EXAM,
      isPublished: true,
    });

    await expect(service.completeUnit('user-1', 'u-final')).rejects.toThrow(
      BadRequestException,
    );
  });
});
