import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import {
  Certificate,
  CertificateSignedUrl,
  CertificateVerificationLog,
} from '../entities';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course/course.entity';
import { S3Module } from '../common/s3.module';
import {AdminGuard} from '../auth/guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Certificate,
      CertificateSignedUrl,
      CertificateVerificationLog,
      User,
      Course,
    ]),
    S3Module,
  ],
  providers: [CertificateService, AdminGuard],
  controllers: [CertificateController],
  exports: [CertificateService],
})
export class CertificateModule {}
