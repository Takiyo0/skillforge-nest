import { BadRequestException } from '@nestjs/common';
import { UnitType } from '../entities/course/unit.entity';
import { UnitProgressStatus } from '../entities/progress/unit-progress.entity';
import { FinalExamComponentType } from '../entities/final-exam-component.entity';

jest.mock('../common/s3.service', () => ({
  S3Service: class S3Service {},
}));

import { CoursesService } from './courses.service';

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

describe('CoursesService - Final Exam Completion Scenarios', () => {
  let service: CoursesService;

  let courseRepository: RepoMock;
  let unitRepository: RepoMock;
  let unitPrerequisiteRepository: RepoMock;
  let moduleContentRepository: RepoMock;
  let moduleResourceRepository: RepoMock;
  let enrollmentRepository: RepoMock;
  let courseProgressRepository: RepoMock;
  let exerciseRepository: RepoMock;
  let exerciseTestCaseRepository: RepoMock;
  let exerciseHintRepository: RepoMock;
  let quizRepository: RepoMock;
  let quizQuestionRepository: RepoMock;
  let quizOptionRepository: RepoMock;
  let codeSubmissionRepository: RepoMock;
  let quizAttemptRepository: RepoMock;
  let quizAttemptAnswerRepository: RepoMock;
  let finalExamAttemptRepository: RepoMock;
  let finalExamRepository: RepoMock;
  let finalExamComponentRepository: RepoMock;
  let unitProgressRepository: RepoMock;
  let xpEventRepository: RepoMock;

  let certificateService: { issueCertificate: jest.Mock };
  let badgesService: {
    checkAndAwardXpMilestones: jest.Mock;
    awardFirstCourseBadge: jest.Mock;
  };
  let s3Service: { getPublicUrl: jest.Mock };

  beforeEach(() => {
    courseRepository = createRepoMock();
    unitRepository = createRepoMock();
    unitPrerequisiteRepository = createRepoMock();
    moduleContentRepository = createRepoMock();
    moduleResourceRepository = createRepoMock();
    enrollmentRepository = createRepoMock();
    courseProgressRepository = createRepoMock();
    exerciseRepository = createRepoMock();
    exerciseTestCaseRepository = createRepoMock();
    exerciseHintRepository = createRepoMock();
    quizRepository = createRepoMock();
    quizQuestionRepository = createRepoMock();
    quizOptionRepository = createRepoMock();
    codeSubmissionRepository = createRepoMock();
    quizAttemptRepository = createRepoMock();
    quizAttemptAnswerRepository = createRepoMock();
    finalExamAttemptRepository = createRepoMock();
    finalExamRepository = createRepoMock();
    finalExamComponentRepository = createRepoMock();
    unitProgressRepository = createRepoMock();
    xpEventRepository = createRepoMock();

    certificateService = {
      issueCertificate: jest.fn(),
    };
    badgesService = {
      checkAndAwardXpMilestones: jest.fn(),
      awardFirstCourseBadge: jest.fn(),
    };
    s3Service = {
      getPublicUrl: jest.fn(),
    };

    service = new CoursesService(
      courseRepository as any,
      unitRepository as any,
      unitPrerequisiteRepository as any,
      moduleContentRepository as any,
      moduleResourceRepository as any,
      enrollmentRepository as any,
      courseProgressRepository as any,
      exerciseRepository as any,
      exerciseTestCaseRepository as any,
      exerciseHintRepository as any,
      quizRepository as any,
      quizQuestionRepository as any,
      quizOptionRepository as any,
      codeSubmissionRepository as any,
      quizAttemptRepository as any,
      quizAttemptAnswerRepository as any,
      finalExamAttemptRepository as any,
      finalExamRepository as any,
      finalExamComponentRepository as any,
      unitProgressRepository as any,
      xpEventRepository as any,
      certificateService as any,
      badgesService as any,
      s3Service as any,
    );
  });

  describe('Scenario: user completes full course and passes final exam', () => {
    it('TC-COURSE-POS-001 should complete final exam unit in a 4-unit course (module, exercise, assessment, final_exam), increase XP activity, award badge, and issue certificate', async () => {
      const userId = 'user-1';
      const courseId = 'course-1';
      const unitId = 'unit-final';
      const quizId = 'quiz-1';
      const questionId = 'q-1';
      const correctOptionId = 'opt-correct';
      const attempt = {
        id: 'attempt-1',
        finalExamUnitId: unitId,
        userId,
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        attemptNumber: 1,
      } as any;

      unitRepository.findOne.mockResolvedValue({
        id: unitId,
        courseId,
        title: 'Final Exam',
        type: UnitType.FINAL_EXAM,
        isPublished: true,
      });
      finalExamRepository.findOne.mockResolvedValue({
        id: 'final-1',
        unitId,
        passingScore: 70,
      });
      finalExamAttemptRepository.findOne.mockResolvedValue(attempt);
      finalExamComponentRepository.find.mockResolvedValue([
        {
          componentType: FinalExamComponentType.QUIZ,
          quiz: { id: quizId },
        },
      ]);
      quizQuestionRepository.find.mockResolvedValue([
        { id: questionId, quizId, points: 10 },
      ]);
      quizQuestionRepository.findOne.mockResolvedValue({
        id: questionId,
        quizId,
        points: 10,
      });
      quizOptionRepository.find.mockResolvedValue([{ id: correctOptionId }]);

      quizAttemptRepository.count.mockResolvedValue(0);
      unitProgressRepository.findOne.mockResolvedValue({
        userId,
        unitId,
        status: UnitProgressStatus.IN_PROGRESS,
      });
      unitRepository.find.mockResolvedValue([
        { id: 'u-module' },
        { id: 'u-exercise' },
        { id: 'u-assessment' },
        { id: unitId },
      ]);
      unitProgressRepository.count.mockResolvedValue(4);
      courseProgressRepository.findOne
        .mockResolvedValueOnce({
          userId,
          courseId,
          totalUnits: 4,
          progressPercent: 0,
        })
        .mockResolvedValueOnce({
          userId,
          courseId,
          progressPercent: 100,
          completedUnits: 4,
          totalUnits: 4,
        });
      unitPrerequisiteRepository.find.mockResolvedValue([]);
      xpEventRepository.find.mockResolvedValue([{ points: 900 }, { points: 100 }]);
      courseRepository.findOne.mockResolvedValue({ id: courseId, language: 'go' });

      const result = await service.submitFinalExamAttempt(
        userId,
        unitId,
        unitId,
        {
          answers: [{ questionId, selectedOptionIds: [correctOptionId] }],
        },
      );

      expect(result.isPassed).toBe(true);
      expect(result.message).toContain('Exam passed');
      expect(xpEventRepository.save).toHaveBeenCalledTimes(1);
      expect(badgesService.checkAndAwardXpMilestones).toHaveBeenCalledWith(
        userId,
        1000,
      );
      expect(badgesService.awardFirstCourseBadge).toHaveBeenCalledWith(
        userId,
        'go',
      );
      expect(certificateService.issueCertificate).toHaveBeenCalledWith(
        userId,
        courseId,
      );
    });
  });

  describe('Scenario: user submits final exam but does not pass', () => {
    it('TC-COURSE-NEG-001 should return failed result and not award badge/certificate', async () => {
      const userId = 'user-1';
      const unitId = 'unit-final';
      const quizId = 'quiz-1';
      const questionId = 'q-1';

      unitRepository.findOne.mockResolvedValue({
        id: unitId,
        courseId: 'course-1',
        title: 'Final Exam',
        type: UnitType.FINAL_EXAM,
        isPublished: true,
      });
      finalExamRepository.findOne.mockResolvedValue({
        id: 'final-1',
        unitId,
        passingScore: 100,
      });
      finalExamAttemptRepository.findOne.mockResolvedValue({
        id: 'attempt-1',
        finalExamUnitId: unitId,
        userId,
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        attemptNumber: 1,
      });
      finalExamComponentRepository.find.mockResolvedValue([
        {
          componentType: FinalExamComponentType.QUIZ,
          quiz: { id: quizId },
        },
      ]);
      quizQuestionRepository.find.mockResolvedValue([
        { id: questionId, quizId, points: 10 },
      ]);
      quizQuestionRepository.findOne.mockResolvedValue({
        id: questionId,
        quizId,
        points: 10,
      });
      quizOptionRepository.find.mockResolvedValue([{ id: 'expected-correct' }]);
      quizAttemptRepository.count.mockResolvedValue(0);

      const result = await service.submitFinalExamAttempt(
        userId,
        unitId,
        unitId,
        {
          answers: [{ questionId, selectedOptionIds: ['wrong-option'] }],
        },
      );

      expect(result.isPassed).toBe(false);
      expect(result.message).toContain('Passing score required');
      expect(xpEventRepository.save).not.toHaveBeenCalled();
      expect(badgesService.awardFirstCourseBadge).not.toHaveBeenCalled();
      expect(certificateService.issueCertificate).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: destructive/tampered submission payload', () => {
    it('TC-COURSE-DES-001 should reject answers containing question IDs outside exam scope', async () => {
      const userId = 'user-1';
      const unitId = 'unit-final';
      const quizId = 'quiz-1';

      unitRepository.findOne.mockResolvedValue({
        id: unitId,
        courseId: 'course-1',
        title: 'Final Exam',
        type: UnitType.FINAL_EXAM,
        isPublished: true,
      });
      finalExamRepository.findOne.mockResolvedValue({
        id: 'final-1',
        unitId,
        passingScore: 70,
      });
      finalExamAttemptRepository.findOne.mockResolvedValue({
        id: 'attempt-1',
        finalExamUnitId: unitId,
        userId,
        startedAt: new Date('2026-01-01T00:00:00.000Z'),
        attemptNumber: 1,
      });
      finalExamComponentRepository.find.mockResolvedValue([
        {
          componentType: FinalExamComponentType.QUIZ,
          quiz: { id: quizId },
        },
      ]);
      quizQuestionRepository.find.mockResolvedValue([
        { id: 'q-allowed', quizId, points: 10 },
      ]);

      await expect(
        service.submitFinalExamAttempt(userId, unitId, unitId, {
          answers: [{ questionId: 'q-injected', selectedOptionIds: ['opt-1'] }],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(finalExamAttemptRepository.save).not.toHaveBeenCalled();
      expect(certificateService.issueCertificate).not.toHaveBeenCalled();
    });
  });
});
