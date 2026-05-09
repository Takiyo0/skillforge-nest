import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from './s3.service';

@Injectable()
export class S3HealthService {
  private readonly logger = new Logger(S3HealthService.name);

  constructor(private s3Service: S3Service) {}

  async checkHealth(): Promise<void> {
    this.logger.log('Starting S3 health check...');
    const result = await this.s3Service.healthCheck();

    if (result.healthy) {
      this.logger.log(`✓ S3 is ready: ${result.details}`);
    } else {
      this.logger.error(`✗ S3 health check failed: ${result.details}`);
      const failedChecks = Object.entries(result.checks)
        .filter(([, value]) => !value)
        .map(([key]) => key);
      this.logger.error(`Failed checks: ${failedChecks.join(', ')}`);
    }
  }
}
