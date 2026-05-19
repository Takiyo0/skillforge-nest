import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubmissionsService } from './submissions.service';
import {
  CodeSubmission,
  SubmissionTestResult,
  ExerciseHint,
  ExerciseAttemptCounter,
} from '../entities';
import { AiReviewService } from './ai-review/ai-review.service';
import { PistonService } from './piston/piston.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;

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
        SubmissionsService,
        { provide: getRepositoryToken(CodeSubmission), useValue: repoMock },
        { provide: getRepositoryToken(SubmissionTestResult), useValue: repoMock },
        { provide: getRepositoryToken(ExerciseHint), useValue: repoMock },
        { provide: getRepositoryToken(ExerciseAttemptCounter), useValue: repoMock },
        {
          provide: AiReviewService,
          useValue: {
            generateCodeExplanation: jest.fn(),
          },
        },
        {
          provide: PistonService,
          useValue: {
            executeCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
