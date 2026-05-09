import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { S3HealthService } from './s3-health.service';

@Module({
  imports: [ConfigModule],
  providers: [S3Service, S3HealthService],
  exports: [S3Service, S3HealthService],
})
export class S3Module {}
