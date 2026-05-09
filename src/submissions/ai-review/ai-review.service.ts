import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiReviewJob, CodeSubmission, SubmissionStatus } from '../../entities';

export interface AiReviewRequest {
  exercisePrompt: string;
  sourceCode: string;
  language: string;
}

export interface AiReviewResponse {
  summary: string;
  score: number;
  model: string;
}

@Injectable()
export class AiReviewService {
  private readonly logger = new Logger(AiReviewService.name);
  private readonly ollamaBaseUrl: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(AiReviewJob)
    private aiReviewJobRepository: Repository<AiReviewJob>,
    @InjectRepository(CodeSubmission)
    private codeSubmissionRepository: Repository<CodeSubmission>,
  ) {
    this.ollamaBaseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ||
      'http://localhost:11434';
  }

  async createReviewJob(
    submission: CodeSubmission,
    exercisePrompt: string,
  ): Promise<AiReviewJob> {
    const job = this.aiReviewJobRepository.create({
      submissionId: submission.id,
      provider: 'ollama',
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

      const result = await this.callOllama(
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
        `AI review completed: score=${result.score}, passing=${isPassing}`,
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

  private async callOllama(
    request: AiReviewRequest,
  ): Promise<AiReviewResponse> {
    const model = 'qwen2.5-coder:7b';
    const maxTokens = 2048;

    const prompt = this.buildCodeReviewPrompt(request);

    this.logger.log(`Calling Ollama with model: ${model}`);

    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          num_predict: maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.response || '';

      this.logger.log('Ollama response received');

      // parse the response to extract summary and score
      const { summary, score } = this.parseReviewResponse(generatedText);

      return {
        summary,
        score,
        model,
      };
    } catch (error) {
      this.logger.error(`Ollama API call failed: ${error.message}`);
      throw new Error(`Failed to call Ollama: ${error.message}`);
    }
  }

  private buildCodeReviewPrompt(request: AiReviewRequest): string {
    return `You are a STRICT code reviewer for a learning platform. You must maintain HIGH standards.

EXERCISE REQUIREMENTS:
${request.exercisePrompt}

PROGRAMMING LANGUAGE:
${request.language}

SUBMITTED CODE:
\`\`\`${request.language}
${request.sourceCode}
\`\`\`

Please provide your review in the following JSON format:
{
  "summary": "A brief, constructive feedback (2-3 sentences) about the code quality, correctness, and how well it solves the exercise.",
  "score": <a number between 0 and 100 representing overall quality>
}

STRICT GRADING RULES:
1. Correctness (40%): Code MUST correctly solve the exercise. Any logical errors = deduct 20+ points. Wrong output = automatic fail (0-30).
2. Code Quality (30%): Code must be clean and readable. Typos in variable names, function names, or comments = deduct 10 points. Poor naming = deduct 15 points. Unorganized code = deduct 15 points.
3. Best Practices (20%): Must follow language conventions. Missing error handling where needed = deduct 10 points. Inefficient code = deduct 5-10 points.
4. Edge Cases (10%): Code must handle reasonable edge cases. Missing edge case handling = deduct 10 points.

PASSING SCORE: 85 or higher ONLY. Code with ANY typos, missing edge cases, or quality issues should score BELOW 85.

Be VERY CRITICAL. Do not give partial credit for "close enough" solutions.
Respond ONLY with valid JSON, no additional text.`;
  }

  private parseReviewResponse(response: string): {
    summary: string;
    score: number;
  } {
    try {
      // try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON found in Ollama response, using defaults');
        return {
          summary: response.substring(0, 500).trim(),
          score: 70,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // validate and sanitize the response
      const summary = String(parsed.summary || '')
        .substring(0, 1000)
        .trim();
      const score = Math.min(100, Math.max(0, parseInt(parsed.score) || 70));

      if (!summary) {
        this.logger.warn('Empty summary in Ollama response, using default');
        return {
          summary: 'Code review completed by Ollama. Please check the score.',
          score,
        };
      }

      return { summary, score };
    } catch (error) {
      this.logger.error(`Failed to parse Ollama response: ${error.message}`);
      return {
        summary:
          'Code review completed. Unable to parse detailed feedback. Please try again.',
        score: 70,
      };
    }
  }
}
