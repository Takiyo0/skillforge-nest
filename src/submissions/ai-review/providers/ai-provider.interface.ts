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

export interface AiProvider {
  /**
   * Review code and return structured feedback with score
   */
  review(request: AiReviewRequest): Promise<AiReviewResponse>;

  /**
   * Get provider name for logging
   */
  getName(): string;

  /**
   * Validate that provider is configured correctly
   */
  validate(): Promise<void>;
}
