import { Injectable, Logger } from '@nestjs/common';
import {
  AiProvider,
  AiReviewRequest,
  AiReviewResponse,
} from './ai-provider.interface';
import {
    getErrorMessage,
    mapToUpstreamException,
    UpstreamDependencyException,
} from '../../../common/runtime-exception.helper';

@Injectable()
export class OllamaProvider implements AiProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly model: string;

    constructor(
        baseUrl: string = 'http://localhost:11434',
        model: string = 'qwen2.5-coder:7b',
    ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  getName(): string {
    return `ollama/${this.model}`;
  }

  async validate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
          throw new UpstreamDependencyException(
              'Ollama',
              'bad_gateway',
              `Ollama service unavailable: ${response.statusText}`,
          );
      }
      this.logger.log(`Ollama provider validated at ${this.baseUrl}`);
    } catch (error) {
        mapToUpstreamException(error, 'Ollama', 'validating the AI provider');
    }
  }

  async review(request: AiReviewRequest): Promise<AiReviewResponse> {
    const prompt = this.buildCodeReviewPrompt(request);
    const maxTokens = 2048;

    this.logger.log(`Calling Ollama with model: ${this.model}`);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          num_predict: maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
          throw new UpstreamDependencyException(
              'Ollama',
              'bad_gateway',
              `Ollama API error: ${response.statusText}`,
          );
      }

        const data = (await response.json()) as { response?: string };
      const generatedText = data.response || '';

      this.logger.log('Ollama response received');

      const { summary, score } = this.parseReviewResponse(generatedText);

      return {
        summary,
        score,
        model: this.model,
      };
    } catch (error) {
        this.logger.error(`Ollama API call failed: ${getErrorMessage(error)}`);
        mapToUpstreamException(error, 'Ollama', 'reviewing code');
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
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON found in Ollama response, using defaults');
        return {
          summary: response.substring(0, 500).trim(),
          score: 70,
        };
      }

        const parsed = JSON.parse(jsonMatch[0]) as {
            summary?: unknown;
            score?: unknown;
        };

        const summary = (typeof parsed.summary === 'string' ? parsed.summary : '')
        .substring(0, 1000)
        .trim();
        const score = Math.min(
            100,
            Math.max(
                0,
                parseInt(
                    typeof parsed.score === 'number' || typeof parsed.score === 'string'
                        ? String(parsed.score)
                        : '70',
                    10,
                ) || 70,
            ),
        );

      if (!summary) {
        this.logger.warn('Empty summary in Ollama response, using default');
        return {
          summary: 'Code review completed by Ollama. Please check the score.',
          score,
        };
      }

      return { summary, score };
    } catch (error) {
        this.logger.error(
            `Failed to parse Ollama response: ${getErrorMessage(error)}`,
        );
      return {
        summary:
          'Code review completed. Unable to parse detailed feedback. Please try again.',
        score: 70,
      };
    }
  }
}
