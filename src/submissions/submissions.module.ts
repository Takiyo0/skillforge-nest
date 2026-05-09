import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { AiReviewService } from './ai-review/ai-review.service';
import { AiProviderFactory } from './ai-review/providers';
import { PistonService } from './piston/piston.service';
import {
  CodeSubmission,
  SubmissionTestResult,
  SubmissionEvent,
  AiReviewJob,
  ExerciseHint,
  ExerciseAttemptCounter,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CodeSubmission,
      SubmissionTestResult,
      SubmissionEvent,
      AiReviewJob,
      ExerciseHint,
      ExerciseAttemptCounter,
    ]),
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, PistonService, AiReviewService, AiProviderFactory],
  exports: [PistonService, AiReviewService, SubmissionsService],
})
export class SubmissionsModule {}
