import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AiReviewService } from './ai-review.service';
import { AiProviderFactory } from './providers';
import { CodeSubmission, AiReviewJob } from '../../entities';

describe('AiReviewService', () => {
  let service: AiReviewService;
  let mockProviderFactory: jest.Mocked<AiProviderFactory>;
  let mockProvider: any;

  beforeEach(async () => {
    mockProvider = {
      getName: jest.fn().mockReturnValue('test/mock-provider'),
      validate: jest.fn().mockResolvedValue(undefined),
      review: jest.fn(),
    };

    mockProviderFactory = {
      createProvider: jest.fn().mockReturnValue(mockProvider),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReviewService,
        {
          provide: AiProviderFactory,
          useValue: mockProviderFactory,
        },
        {
          provide: getRepositoryToken(AiReviewJob),
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(CodeSubmission),
          useValue: { save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AiReviewService>(AiReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get provider name from factory', () => {
    expect(mockProviderFactory.createProvider).toHaveBeenCalled();
  });
});
