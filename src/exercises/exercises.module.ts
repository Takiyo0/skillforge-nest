import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import {
  Exercise,
  ExerciseTestCase,
  ExerciseHint,
  ExerciseAttemptCounter,
  CodeSubmission,
  SubmissionTestResult,
  AiReviewJob,
} from '../entities';
import { SubmissionsModule } from '../submissions/submissions.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exercise,
      ExerciseTestCase,
      ExerciseHint,
      ExerciseAttemptCounter,
      CodeSubmission,
      SubmissionTestResult,
      AiReviewJob,
    ]),
    SubmissionsModule,
    ProgressModule,
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
