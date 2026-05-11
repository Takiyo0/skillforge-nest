import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
    CodeSubmission,
    SubmissionTestResult,
    ExerciseHint,
    ExerciseAttemptCounter,
} from '../entities';
import {SubmissionResponseDto} from './dto/submission-response.dto';
import {FeedbackResponseDto, HintDto} from './dto/feedback-response.dto';
import { AiReviewService } from './ai-review/ai-review.service';
import {
    CODE_LANGUAGE_BASE_CODE,
    CODE_LANGUAGE_NAMES,
    normalizeCodeLanguage,
    SUPPORTED_CODE_LANGUAGES,
} from '../common/constants/supported-languages';
import { PistonService } from './piston/piston.service';

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
        private aiReviewService: AiReviewService,
        private pistonService: PistonService,
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
            aiCodeExplanation: submission.aiCodeExplanation,
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
                aiCodeExplanation: submission.aiCodeExplanation,
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

    async askAiCodeExplanation(
        submissionId: string,
        userId: string,
    ): Promise<{ submissionId: string; aiCodeExplanation: string; alreadyExists: boolean }> {
        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId, userId },
        });

        if (!submission) {
            throw new NotFoundException('Submission not found');
        }

        if (!submission.exerciseId) {
            throw new ConflictException('Submission is not linked to an exercise');
        }

        const existingExerciseExplanation = await this.submissionRepository.findOne({
            where: {
                userId,
                exerciseId: submission.exerciseId,
                aiCodeExplanation: Not(IsNull()),
            },
            order: { queuedAt: 'DESC' },
        });

        if (existingExerciseExplanation?.aiCodeExplanation?.trim()) {
            return {
                submissionId: existingExerciseExplanation.id,
                aiCodeExplanation: existingExerciseExplanation.aiCodeExplanation,
                alreadyExists: true,
            };
        }

        if (!submission.sourceCode?.trim()) {
            throw new ConflictException('Submission source code is empty');
        }

        const explanation = await this.aiReviewService.generateCodeExplanation(
            submission.sourceCode,
            submission.language,
        );

        submission.aiCodeExplanation = explanation;
        await this.submissionRepository.save(submission);

        return {
            submissionId: submission.id,
            aiCodeExplanation: explanation,
            alreadyExists: false,
        };
    }

    getSandboxLanguages(includeBaseCode = false): Array<{
        id: string;
        name: string;
        baseCode?: string;
    }> {
        return SUPPORTED_CODE_LANGUAGES.map((language) => ({
            id: language,
            name: CODE_LANGUAGE_NAMES[language],
            ...(includeBaseCode ? { baseCode: CODE_LANGUAGE_BASE_CODE[language] } : {}),
        }));
    }

    async runCodeSandbox(payload: {
        code: string;
        language: string;
        testCases: Array<{ input?: string; output?: string }>;
    }): Promise<{
        language: string;
        results: Array<{
            index: number;
            input: string;
            expectedOutput?: string;
            actualOutput: string;
            stderr?: string;
            compileOutput?: string;
            exitCode: number;
            isCorrect: boolean | null;
            passed: boolean;
        }>;
    }> {
        const normalizedLanguage = normalizeCodeLanguage(payload.language);
        if (!normalizedLanguage) {
            throw new ConflictException('Unsupported language');
        }

        const cases = payload.testCases?.length
            ? payload.testCases
            : [{ input: '', output: undefined }];

        const results = await Promise.all(
            cases.map(async (testCase, index) => {
                const execution = await this.pistonService.executeCode({
                    sourceCode: payload.code,
                    language: normalizedLanguage,
                    stdin: testCase.input || '',
                });

                const actualOutput = (execution.stdout || '').trim();
                const expectedOutput = testCase.output;
                const normalizedExpected =
                    typeof expectedOutput === 'string' ? expectedOutput.trim() : undefined;
                const isCorrect =
                    normalizedExpected !== undefined
                        ? actualOutput === normalizedExpected
                        : null;

                return {
                    index,
                    input: testCase.input || '',
                    expectedOutput: normalizedExpected,
                    actualOutput,
                    stderr: execution.stderr || undefined,
                    compileOutput: execution.compileOutput || undefined,
                    exitCode: execution.exitCode,
                    isCorrect,
                    passed:
                        execution.passed &&
                        (isCorrect === null ? true : isCorrect),
                };
            }),
        );

        return {
            language: normalizedLanguage,
            results,
        };
    }
}
