import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeCodeLanguage } from '../../common/constants/supported-languages';
import {
    getErrorMessage,
    mapToUpstreamException,
    UpstreamDependencyException,
} from '../../common/runtime-exception.helper';

export interface PistonExecuteRequest {
  sourceCode: string;
  language: string;
  stdin?: string;
  runTimeoutMs?: number;
  runMemoryLimitKb?: number;
}

interface PistonApiExecuteResponse {
  language: string;
  version: string;
  run: {
    stdout?: string;
    stderr?: string;
    code: number;
    signal?: string;
    output?: string;
  };
  compile?: {
    stdout?: string;
    stderr?: string;
    code?: number;
    output?: string;
  };
}

export interface PistonExecuteResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
  exitCode: number;
  passed: boolean;
  executionTimeMs?: number;
  memoryKb?: number;
}

@Injectable()
export class PistonService {
  private readonly logger = new Logger(PistonService.name);
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('PISTON_BASE_URL') ||
      'http://localhost:2000';
  }

  async executeCode(
    request: PistonExecuteRequest,
  ): Promise<PistonExecuteResult> {
    if (request.runTimeoutMs && request.runTimeoutMs > 3000)
      request.runTimeoutMs = 3000;
    const payload = {
      language: this.normalizeLanguage(request.language),
      version: '*',
      files: [{ content: request.sourceCode }],
      stdin: request.stdin || '',
      compile_timeout: request.runTimeoutMs ?? 3000,
      run_timeout: request.runTimeoutMs ?? 3000,
      run_memory_limit: request.runMemoryLimitKb
        ? request.runMemoryLimitKb * 1024
        : undefined,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/v2/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
          throw new UpstreamDependencyException(
              'Piston',
              'bad_gateway',
          `Piston API error: ${response.status} ${response.statusText} - ${await response.text()}`,
        );
      }

      const result = (await response.json()) as PistonApiExecuteResponse;

      console.log(result);

      return {
        stdout: result.run?.stdout || '',
        stderr: result.run?.stderr || '',
        compileOutput:
          result.compile?.stderr ||
          result.compile?.stdout ||
          result.compile?.output ||
          '',
        exitCode: result.run?.code ?? -1,
        passed: (result.run?.code ?? -1) === 0,
      };
    } catch (error) {
        this.logger.error(
            `Failed to execute code with Piston: ${getErrorMessage(error)}`,
        );
        mapToUpstreamException(error, 'Piston', 'executing code');
    }
  }

  private normalizeLanguage(language: string): string {
    const normalized = normalizeCodeLanguage(language);
    return normalized || 'javascript';
  }
}
