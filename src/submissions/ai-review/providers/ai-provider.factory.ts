import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { OllamaProvider } from './ollama.provider';
import { GeminiProvider } from './gemini.provider';

export type AiProviderType = 'ollama' | 'gemini';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(private configService: ConfigService) {}

  createProvider(): AiProvider {
    const providerType = (this.configService.get<string>('AI_PROVIDER') ||
      'gemini') as AiProviderType;

    this.logger.log(`Creating AI provider: ${providerType}`);

    switch (providerType) {
      case 'ollama':
        return this.createOllamaProvider();
      case 'gemini':
        return this.createGeminiProvider();
      default:
        throw new Error(
          `Unknown AI provider: ${providerType}. Supported providers: ollama, gemini`,
        );
    }
  }

  private createOllamaProvider(): AiProvider {
    const baseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ||
      'http://localhost:11434';
    const model =
      this.configService.get<string>('OLLAMA_MODEL') || 'qwen2.5-coder:7b';

    this.logger.log(`Ollama provider configured: baseUrl=${baseUrl}, model=${model}`);
    return new OllamaProvider(baseUrl, model);
  }

  private createGeminiProvider(): AiProvider {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY environment variable is required when using Gemini provider',
      );
    }

    const model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash';

    this.logger.log(`Gemini provider configured with model: ${model}`);
    return new GeminiProvider(apiKey, model);
  }
}
