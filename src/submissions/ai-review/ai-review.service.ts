import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiReviewJob, CodeSubmission, SubmissionStatus } from '../../entities';
import {
  AiProvider,
  AiReviewRequest,
  AiReviewResponse,
  AiProviderFactory,
} from './providers';

@Injectable()
export class AiReviewService {
  private readonly logger = new Logger(AiReviewService.name);
  private provider: AiProvider;

  constructor(
    private aiProviderFactory: AiProviderFactory,
    @InjectRepository(AiReviewJob)
    private aiReviewJobRepository: Repository<AiReviewJob>,
    @InjectRepository(CodeSubmission)
    private codeSubmissionRepository: Repository<CodeSubmission>,
  ) {
    this.provider = this.aiProviderFactory.createProvider();
  }

  async createReviewJob(
    submission: CodeSubmission,
    exercisePrompt: string,
  ): Promise<AiReviewJob> {
    const job = this.aiReviewJobRepository.create({
      submissionId: submission.id,
      provider: this.provider.getName(),
      status: SubmissionStatus.QUEUED,
      requestPayload: {
        exercisePrompt,
        sourceCode: submission.sourceCode,
        language: submission.language,
      },
    });

    return await this.aiReviewJobRepository.save(job);
  }

  async processReview(jobId: string): Promise<void> {
    const job = await this.aiReviewJobRepository.findOne({
      where: { id: jobId },
      relations: ['submission'],
    });

    if (!job) {
      this.logger.error(`Review job ${jobId} not found`);
      return;
    }

    try {
      job.status = SubmissionStatus.RUNNING;
      await this.aiReviewJobRepository.save(job);

      const result = await this.provider.review(
        job.requestPayload as AiReviewRequest,
      );

      job.status = SubmissionStatus.REVIEWED;
      job.responsePayload = result;
      job.promptTemplateVersion = 'v1';

      // update submission, only PASS if score is 80 or higher
      const isPassing = result.score >= 80;
      job.submission.status = isPassing
        ? SubmissionStatus.PASSED
        : SubmissionStatus.REVIEWED;
      job.submission.aiSummary = result.summary;
      job.submission.aiScore = result.score;
      job.submission.aiModel = result.model;
      job.submission.finishedAt = new Date();

      this.logger.log(
        `AI review completed: provider=${this.provider.getName()}, score=${result.score}, passing=${isPassing}`,
      );

      await this.aiReviewJobRepository.save(job);
      await this.codeSubmissionRepository.save(job.submission);
    } catch (error) {
      this.logger.error(`Failed to process review job: ${error.message}`);
      job.status = SubmissionStatus.ERRORED;
      job.submission.status = SubmissionStatus.ERRORED;
      await this.aiReviewJobRepository.save(job);
      await this.codeSubmissionRepository.save(job.submission);
    }
  }

  async validateProvider(): Promise<void> {
    await this.provider.validate();
  }

  async generateCodeExplanation(
    sourceCode: string,
    language: string,
  ): Promise<string> {
    const result = await this.provider.review({
      exercisePrompt:
        'Explain what is wrong with this student submission. Focus on bugs, failing logic, edge cases, and how to fix them. Keep it concise, actionable, and beginner-friendly.',
      sourceCode,
      language,
    });

    return result.summary;
  }
}
