import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {
    CodeSubmission,
    SubmissionTestResult,
    ExerciseHint,
    ExerciseAttemptCounter,
} from '../entities';
import {SubmissionResponseDto} from './dto/submission-response.dto';
import {FeedbackResponseDto, HintDto} from './dto/feedback-response.dto';

@Injectable()
export class SubmissionsService {
    constructor(
        @InjectRepository(CodeSubmission)
        private submissionRepository: Repository<CodeSubmission>,
        @InjectRepository(SubmissionTestResult)
        private testResultRepository: Repository<SubmissionTestResult>,
        @InjectRepository(ExerciseHint)
        private hintRepository: Repository<ExerciseHint>,
        @InjectRepository(ExerciseAttemptCounter)
        private attemptCounterRepository: Repository<ExerciseAttemptCounter>,
    ) {
    }

    async getSubmissionStatus(
        submissionId: string,
        userId: string,
    ): Promise<SubmissionResponseDto> {
        const submission = await this.submissionRepository.findOne({
            where: {id: submissionId, userId},
            relations: ['testResults', 'testResults.testCase'],
        });

        if (!submission) {
            throw new NotFoundException('Submission not found');
        }

        // filter hidden tests and count results
        const visibleTestResults =
            submission.testResults?.filter((tr) => !tr.testCase?.isHidden) || [];

        const testsPassed = submission.testResults.filter((tr) => tr.passed).length;
        const totalTests = submission.testResults.length;

        return {
            id: submission.id,
            status: submission.status,
            kind: submission.kind,
            language: submission.language,
            sourceCode: submission.sourceCode,
            attemptNumber: submission.attemptNumber,
            queuedAt: submission.queuedAt,
            finishedAt: submission.finishedAt,
            stdout: submission.stdout,
            stderr: submission.stderr,
            compileOutput: submission.compileOutput,
            aiSummary: submission.aiSummary,
            aiScore: submission.aiScore,
            testsPassed,
            totalTests,
            testResults: visibleTestResults.map((tr) => ({
                testCaseId: tr.testCaseId,
                passed: tr.passed,
                actualOutput: tr.actualOutput,
                expectedOutput: tr.expectedOutput,
                executionTimeMs: tr.executionTimeMs,
                memoryKb: tr.memoryKb,
            })),
        };
    }

    async getSubmissionFeedback(
        submissionId: string,
        userId: string,
    ): Promise<FeedbackResponseDto> {
        const submission = await this.submissionRepository.findOne({
            where: {id: submissionId, userId},
            relations: ['testResults', 'testResults.testCase'],
        });

        if (!submission) {
            throw new NotFoundException('Submission not found');
        }

        // Get attempt counter
        const counter = await this.attemptCounterRepository.findOne({
            where: {userId, exerciseId: submission.exerciseId},
        });

        const failedAttempts = counter?.failedAttempts || 0;

        // Get hints
        const allHints = await this.hintRepository.find({
            where: {exerciseId: submission.exerciseId},
            order: {position: 'ASC'},
        });

        const hints: HintDto[] = allHints.map((hint) => ({
            hintText: hint.hintText,
            unlocked: failedAttempts >= hint.unlockAfterFailedAttempts,
            position: hint.position,
        }));

        // Filter hidden tests and count results
        const visibleTestResults =
            submission.testResults?.filter((tr) => !tr.testCase?.isHidden) || [];

        const testsPassed = submission.testResults.filter((tr) => tr.passed).length;
        const totalTests = submission.testResults.length;

        const testResults = visibleTestResults.map((tr) => ({
            passed: tr.passed,
            actualOutput: tr.actualOutput,
            expectedOutput: tr.expectedOutput,
        }));

        return {
            submissionId: submission.id,
            status: submission.status,
            testsPassed,
            totalTests,
            hints,
            testResults,
        };
    }

    async getUserUnitSubmissions(
        unitId: string,
        userId: string,
    ): Promise<SubmissionResponseDto[]> {
        const submissions = await this.submissionRepository.find({
            where: {unitId, userId},
            relations: ['testResults', 'testResults.testCase'],
            order: {queuedAt: 'DESC'},
        });

        return submissions.map((submission) => {
            // Filter hidden tests and count results
            const visibleTestResults =
                submission.testResults?.filter((tr) => !tr.testCase?.isHidden) || [];

            const testsPassed = submission.testResults.filter((tr) => tr.passed).length;
            const totalTests = submission.testResults.length;

            return {
                id: submission.id,
                status: submission.status,
                kind: submission.kind,
                language: submission.language,
                sourceCode: submission.sourceCode,
                attemptNumber: submission.attemptNumber,
                queuedAt: submission.queuedAt,
                finishedAt: submission.finishedAt,
                stdout: submission.stdout,
                stderr: submission.stderr,
                compileOutput: submission.compileOutput,
                aiSummary: submission.aiSummary,
                aiScore: submission.aiScore,
                testsPassed,
                totalTests,
                testResults: visibleTestResults.map((tr) => ({
                    testCaseId: tr.testCaseId,
                    passed: tr.passed,
                    actualOutput: tr.actualOutput,
                    expectedOutput: tr.expectedOutput,
                    executionTimeMs: tr.executionTimeMs,
                    memoryKb: tr.memoryKb,
                })),
            };
        });
    }
}
