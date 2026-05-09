import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Exercise,
  ExerciseTestCase,
  CodeSubmission,
  SubmissionTestResult,
  SubmissionKind,
  SubmissionStatus,
  ChallengeDifficulty,
  ExerciseAttemptCounter,
} from '../entities';
import { SubmitCodeDto } from './dto/submit-code.dto';
import { AiReviewService } from '../submissions/ai-review/ai-review.service';
import { PistonService } from '../submissions/piston/piston.service';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private exerciseRepository: Repository<Exercise>,
    @InjectRepository(ExerciseTestCase)
    private testCaseRepository: Repository<ExerciseTestCase>,
    @InjectRepository(CodeSubmission)
    private submissionRepository: Repository<CodeSubmission>,
    @InjectRepository(SubmissionTestResult)
    private testResultRepository: Repository<SubmissionTestResult>,
    @InjectRepository(ExerciseAttemptCounter)
    private attemptCounterRepository: Repository<ExerciseAttemptCounter>,
    private pistonService: PistonService,
    private aiReviewService: AiReviewService,
    private progressService: ProgressService,
  ) {}

  async submitNormalExercise(
    unitId: string,
    exerciseId: string,
    userId: string,
    submitDto: SubmitCodeDto,
  ): Promise<{ id: string; status: string }> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId, unitId },
      relations: ['testCases', 'unit'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    if (exercise.difficulty !== ChallengeDifficulty.NORMAL) {
      throw new NotFoundException(
        'Exercise is not a normal difficulty exercise',
      );
    }

    let counter = await this.attemptCounterRepository.findOne({
      where: { userId, exerciseId },
    });

    if (!counter) {
      counter = this.attemptCounterRepository.create({
        userId,
        exerciseId,
        failedAttempts: 0,
      });
      await this.attemptCounterRepository.save(counter);
    }

    const attemptNumber = counter.failedAttempts + 1;

    const submission = this.submissionRepository.create({
      userId,
      courseId: exercise.unit.courseId,
      unitId,
      exerciseId,
      kind: SubmissionKind.EXERCISE_NORMAL,
      status: SubmissionStatus.QUEUED,
      language: submitDto.language,
      sourceCode: submitDto.sourceCode,
      attemptNumber,
    });

    const savedSubmission = await this.submissionRepository.save(submission);

    this.processNormalSubmission(savedSubmission.id, exercise.testCases).catch(
      (err) => console.error('Failed to process submission:', err),
    );

    return {
      id: savedSubmission.id,
      status: savedSubmission.status,
    };
  }

  private async processNormalSubmission(
    submissionId: string,
    testCases: ExerciseTestCase[],
  ): Promise<void> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      return;
    }

    submission.status = SubmissionStatus.RUNNING;
    await this.submissionRepository.save(submission);

    try {
      const testResults: SubmissionTestResult[] = [];
      let allPassed = true;

      for (const testCase of testCases) {
        const result = await this.pistonService.executeCode({
          sourceCode: submission.sourceCode,
          language: submission.language,
          stdin: testCase.inputText,
          runTimeoutMs: 10000,
        });

        const passed =
          result.passed &&
          result.stdout?.trim() === testCase.expectedOutput?.trim();

        if (!passed) {
          allPassed = false;
        }

        const testResult = this.testResultRepository.create({
          submissionId: submission.id,
          testCaseId: testCase.id,
          passed,
          actualOutput: result.stdout,
          expectedOutput: testCase.expectedOutput,
          executionTimeMs: result.executionTimeMs,
          memoryKb: result.memoryKb,
        });

        testResults.push(testResult);

        submission.stdout = result.stdout;
        submission.stderr = result.stderr;
        submission.compileOutput = result.compileOutput;
      }

      await this.testResultRepository.save(testResults);

      submission.status = allPassed
        ? SubmissionStatus.PASSED
        : SubmissionStatus.FAILED;
      submission.finishedAt = new Date();

      // update attempt counter
      if (!allPassed) {
        const counter = await this.attemptCounterRepository.findOne({
          where: {
            userId: submission.userId,
            exerciseId: submission.exerciseId,
          },
        });

        if (counter) {
          counter.failedAttempts += 1;
          counter.lastFailedAt = new Date();
          await this.attemptCounterRepository.save(counter);
        }
      } else {
        const counter = await this.attemptCounterRepository.findOne({
          where: {
            userId: submission.userId,
            exerciseId: submission.exerciseId,
          },
        });

        if (counter) {
          counter.lastPassedAt = new Date();
          await this.attemptCounterRepository.save(counter);
        }
      }

      await this.submissionRepository.save(submission);

      if (allPassed) {
        try {
          await this.progressService.completeExerciseUnitBySubmission(
            submission.userId,
            submission.unitId,
            submission.id,
            100,
          );
        } catch (progressError) {
          console.error(
            'Failed to auto-complete exercise unit progress:',
            progressError,
          );
        }
      }
    } catch (error) {
      submission.status = SubmissionStatus.ERRORED;
      submission.stderr = error.message;
      submission.finishedAt = new Date();
      await this.submissionRepository.save(submission);
    }
  }

  async submitAdvancedExercise(
    unitId: string,
    exerciseId: string,
    userId: string,
    submitDto: SubmitCodeDto,
  ): Promise<{ id: string; status: string }> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId, unitId },
      relations: ['unit'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    if (exercise.difficulty !== ChallengeDifficulty.ADVANCED) {
      throw new NotFoundException(
        'Exercise is not an advanced difficulty exercise',
      );
    }

    let counter = await this.attemptCounterRepository.findOne({
      where: { userId, exerciseId },
    });

    if (!counter) {
      counter = this.attemptCounterRepository.create({
        userId,
        exerciseId,
        failedAttempts: 0,
      });
      await this.attemptCounterRepository.save(counter);
    }

    const attemptNumber = counter.failedAttempts + 1;

    const submission = this.submissionRepository.create({
      userId,
      courseId: exercise.unit.courseId,
      unitId,
      exerciseId,
      kind: SubmissionKind.EXERCISE_ADVANCED,
      status: SubmissionStatus.QUEUED,
      language: submitDto.language,
      sourceCode: submitDto.sourceCode,
      attemptNumber,
    });

    const savedSubmission = await this.submissionRepository.save(submission);

    // create and process AI review immediately
    const reviewJob = await this.aiReviewService.createReviewJob(
      savedSubmission,
      exercise.promptMarkdown,
    );

    // process review synchronously
    try {
      await this.aiReviewService.processReview(reviewJob.id);

      // check if submission was marked as PASSED after AI review
      const updatedSubmission = await this.submissionRepository.findOne({
        where: { id: savedSubmission.id },
      });

      if (updatedSubmission?.status === SubmissionStatus.PASSED) {
        // auto-complete the exercise unit
        try {
          await this.progressService.completeExerciseUnitBySubmission(
            userId,
            unitId,
            exerciseId,
          );
        } catch (progressError) {
          console.error(
            'Failed to auto-complete exercise unit progress:',
            progressError,
          );
        }
      }
    } catch (error) {
      // if AI review fails, submission stays in error state
      console.error('AI review failed:', error);
    }

    return {
      id: savedSubmission.id,
      status: 'queued', // return 202 Accepted
    };
  }

  async getExerciseByUnit(unitId: string): Promise<{
    id: string;
    unitId: string;
    difficulty: string;
    title: string;
    promptMarkdown: string;
    language: string;
    starterCode: string | null;
    maxCpuMs: number | null;
    maxMemoryKb: number | null;
    createdAt: Date;
    testCases: Array<{
      id: string;
      inputText: string | null;
      expectedOutput: string;
      isHidden: boolean;
      weight: number;
    }>;
    hints: Array<{
      id: string;
      hintText: string;
      unlockAfterFailedAttempts: number;
      position: number;
    }>;
  }> {
    const exercise = await this.exerciseRepository.findOne({
      where: { unitId },
      relations: ['testCases', 'hints'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found for this unit');
    }

    return {
      id: exercise.id,
      unitId: exercise.unitId,
      difficulty: exercise.difficulty,
      title: exercise.title,
      promptMarkdown: exercise.promptMarkdown,
      language: exercise.language,
      starterCode: exercise.starterCode,
      maxCpuMs: exercise.maxCpuMs,
      maxMemoryKb: exercise.maxMemoryKb,
      createdAt: exercise.createdAt,
      testCases: (exercise.testCases || []).map((testCase) => ({
        id: testCase.id,
        inputText: testCase.inputText,
        expectedOutput: testCase.expectedOutput,
        isHidden: testCase.isHidden,
        weight: Number(testCase.weight),
      })),
      hints: (exercise.hints || [])
        .sort((a, b) => a.position - b.position)
        .map((hint) => ({
          id: hint.id,
          hintText: hint.hintText,
          unlockAfterFailedAttempts: hint.unlockAfterFailedAttempts,
          position: hint.position,
        })),
    };
  }

  async getExerciseDetail(
    unitId: string,
    exerciseId: string,
  ): Promise<{
    id: string;
    unitId: string;
    difficulty: string;
    title: string;
    promptMarkdown: string;
    language: string;
    starterCode: string | null;
    maxCpuMs: number | null;
    maxMemoryKb: number | null;
    createdAt: Date;
    testCases: Array<{
      id: string;
      inputText: string | null;
      expectedOutput: string;
      isHidden: boolean;
      weight: number;
    }>;
    hints: Array<{
      id: string;
      hintText: string;
      unlockAfterFailedAttempts: number;
      position: number;
    }>;
  }> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId, unitId },
      relations: ['testCases', 'hints'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    return {
      id: exercise.id,
      unitId: exercise.unitId,
      difficulty: exercise.difficulty,
      title: exercise.title,
      promptMarkdown: exercise.promptMarkdown,
      language: exercise.language,
      starterCode: exercise.starterCode,
      maxCpuMs: exercise.maxCpuMs,
      maxMemoryKb: exercise.maxMemoryKb,
      createdAt: exercise.createdAt,
      testCases: (exercise.testCases || []).map((testCase) => ({
        id: testCase.id,
        inputText: testCase.inputText,
        expectedOutput: testCase.expectedOutput,
        isHidden: testCase.isHidden,
        weight: Number(testCase.weight),
      })),
      hints: (exercise.hints || [])
        .sort((a, b) => a.position - b.position)
        .map((hint) => ({
          id: hint.id,
          hintText: hint.hintText,
          unlockAfterFailedAttempts: hint.unlockAfterFailedAttempts,
          position: hint.position,
        })),
    };
  }
}
