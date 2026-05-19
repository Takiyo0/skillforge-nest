import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import {
  Quiz,
  QuizQuestion,
  QuizOption,
  QuizAttempt,
  QuizAttemptAnswer,
  Unit,
} from '../entities';
import { ProgressService } from '../progress/progress.service';

describe('QuizzesService', () => {
  let service: QuizzesService;

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
        QuizzesService,
        { provide: getRepositoryToken(Quiz), useValue: repoMock },
        { provide: getRepositoryToken(QuizQuestion), useValue: repoMock },
        { provide: getRepositoryToken(QuizOption), useValue: repoMock },
        { provide: getRepositoryToken(QuizAttempt), useValue: repoMock },
        { provide: getRepositoryToken(QuizAttemptAnswer), useValue: repoMock },
        { provide: getRepositoryToken(Unit), useValue: repoMock },
        {
          provide: ProgressService,
          useValue: {
            completeQuizUnitBySubmission: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
