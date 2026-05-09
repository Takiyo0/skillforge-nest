import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AiProvider,
  AiReviewRequest,
  AiReviewResponse,
} from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  getName(): string {
    return `gemini/${this.model}`;
  }

  async validate(): Promise<void> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model });
      await model.generateContent('ping');
      this.logger.log(`Gemini provider validated with model: ${this.model}`);
    } catch (error) {
      throw new Error(`Failed to validate Gemini provider: ${error.message}`);
    }
  }

  async review(request: AiReviewRequest): Promise<AiReviewResponse> {
    const prompt = this.buildCodeReviewPrompt(request);

    this.logger.log(`Calling Gemini with model: ${this.model}`);

    try {
      const model = this.client.getGenerativeModel({ model: this.model });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      const response = result.response;
      const generatedText = response.text();

      this.logger.log('Gemini response received');

      const { summary, score } = this.parseReviewResponse(generatedText);

      return {
        summary,
        score,
        model: this.model,
      };
    } catch (error) {
      this.logger.error(`Gemini API call failed: ${error.message}`);
      throw new Error(`Failed to call Gemini: ${error.message}`);
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
        this.logger.warn('No JSON found in Gemini response, using defaults');
        return {
          summary: response.substring(0, 500).trim(),
          score: 70,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const summary = String(parsed.summary || '')
        .substring(0, 1000)
        .trim();
      const score = Math.min(100, Math.max(0, parseInt(parsed.score) || 70));

      if (!summary) {
        this.logger.warn('Empty summary in Gemini response, using default');
        return {
          summary: 'Code review completed by Gemini. Please check the score.',
          score,
        };
      }

      return { summary, score };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      return {
        summary:
          'Code review completed. Unable to parse detailed feedback. Please try again.',
        score: 70,
      };
    }
  }
}
