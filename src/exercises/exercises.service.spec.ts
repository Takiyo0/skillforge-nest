import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';
import {
  Exercise,
  ExerciseTestCase,
  CodeSubmission,
  SubmissionTestResult,
  ExerciseAttemptCounter,
} from '../entities';
import { PistonService } from '../submissions/piston/piston.service';
import { AiReviewService } from '../submissions/ai-review/ai-review.service';
import { ProgressService } from '../progress/progress.service';

describe('ExercisesService', () => {
  let service: ExercisesService;

  const repoMock = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => payload),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: getRepositoryToken(Exercise), useValue: repoMock },
        { provide: getRepositoryToken(ExerciseTestCase), useValue: repoMock },
        { provide: getRepositoryToken(CodeSubmission), useValue: repoMock },
          {
              provide: getRepositoryToken(SubmissionTestResult),
              useValue: repoMock,
          },
          {
              provide: getRepositoryToken(ExerciseAttemptCounter),
              useValue: repoMock,
          },
        {
          provide: PistonService,
          useValue: {
            executeCode: jest.fn(),
          },
        },
        {
          provide: AiReviewService,
          useValue: {
            createReviewJob: jest.fn(),
            processReview: jest.fn(),
          },
        },
        {
          provide: ProgressService,
          useValue: {
            completeExerciseUnitBySubmission: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
