import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Certificate,
  CertificateSignedUrl,
  CertificateVerificationLog,
  UserRoleEnum,
  VerificationResult,
} from '../entities';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course/course.entity';
import { S3Service } from '../common/s3.service';
import * as crypto from 'crypto';
import PDFDocument from 'pdfkit';

type UserRoleLike = UserRoleEnum | { role: UserRoleEnum | string } | string;

export interface PublicCertificateResponse {
  id: string;
  certificateCode: string;
  userName: string;
  courseName: string;
  courseLevel: string;
  issuedAt: Date;
  completedAt: string;
  isRevoked: boolean;
}

export interface SelfCertificateResponse extends PublicCertificateResponse {
  courseId: string;
}

export interface AdminCertificateResponse extends SelfCertificateResponse {
  userId: string;
  userEmail?: string;
  pdfAvailable: boolean;
  revokedAt: Date | null;
}

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @InjectRepository(CertificateSignedUrl)
    private certificateSignedUrlRepository: Repository<CertificateSignedUrl>,
    @InjectRepository(CertificateVerificationLog)
    private certificateVerificationLogRepository: Repository<CertificateVerificationLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private s3Service: S3Service,
  ) {}

  async issueCertificate(
    userId: string,
    courseId: string,
  ): Promise<Certificate> {
    // Check if certificate already exists
    const existingCert = await this.certificateRepository.findOne({
      where: { userId, courseId },
    });

    if (existingCert) {
      if (existingCert.isRevoked) {
        throw new BadRequestException('This certificate has been revoked');
      }
      return existingCert;
    }

    // Fetch user and course
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!user || !course) {
      throw new NotFoundException('User or course not found');
    }

    // Generate codes
    const certificateCode = `CERT-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const verificationCode = crypto.randomBytes(48).toString('hex');

    // Create completion snapshot
    const completionSnapshot = {
      userName: user.displayName,
      courseName: course.title,
      courseLevel: course.level,
      completedAt: new Date().toISOString(),
      totalUnits: 0, // Will be calculated from database
    };

    // Create QR payload
    const qrPayload = {
      certificateCode,
      verificationCode,
      userId,
      courseId,
      issuedAt: new Date().toISOString(),
    };

    // Create QR URL with base64 encoded payload
    const payloadBase64 = Buffer.from(JSON.stringify(qrPayload)).toString(
      'base64',
    );
    const qrUrl = `${process.env.APP_BASE_URL || 'http://localhost:6567'}/student/certificates/verification?payload=${payloadBase64}`;

    // Create certificate entity
    const certificate = this.certificateRepository.create({
      certificateCode,
      userId,
      courseId,
      completionSnapshot,
      qrPayload: qrUrl,
      verificationCode,
    });

    // Save to database
    await this.certificateRepository.save(certificate);

    // Generate and upload PDF (simplified for now)
    try {
      const pdfBuffer = await this.generateCertificatePDF(
        user.displayName,
        course.title,
        new Date(),
      );
      const pdfS3Key = await this.s3Service.uploadFile(
        pdfBuffer,
        'application/pdf',
        'certificates',
        `${certificateCode}.pdf`,
      );
      certificate.pdfS3Key = pdfS3Key;
      await this.certificateRepository.save(certificate);
    } catch (error) {
      // Log error but don't fail - certificate is issued, just PDF generation failed
      console.error('Failed to generate certificate PDF:', error);
    }

    return certificate;
  }

  async getCertificate(
      certificateId: string,
  ): Promise<PublicCertificateResponse> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return this.toPublicCertificate(certificate);
  }

  async getUserCourseCertificate(
    userId: string,
    courseId: string,
  ): Promise<SelfCertificateResponse> {
    this.assertUserId(userId);

    const certificate = await this.certificateRepository.findOne({
      where: { userId, courseId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return this.toSelfCertificate(certificate);
  }

  async listUserCertificates(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: SelfCertificateResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [certificates, total] = await this.certificateRepository.findAndCount(
      {
        where: { userId },
        relations: ['course'],
        order: { issuedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    return {
      data: certificates.map((certificate) =>
          this.toSelfCertificate(certificate),
      ),
      total,
      page,
      limit,
    };
  }

  async listAllCertificates(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: AdminCertificateResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [certificates, total] = await this.certificateRepository.findAndCount(
      {
        relations: ['user', 'course'],
        order: { issuedAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    return {
      data: certificates.map((certificate) =>
          this.toAdminCertificate(certificate),
      ),
      total,
      page,
      limit,
    };
  }

  async verifyCertificate(
    verificationCode: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Certificate> {
    // Log verification attempt
    const log = this.certificateVerificationLogRepository.create({
      verificationCode,
      ipAddress,
      userAgent,
      result: VerificationResult.NOT_FOUND,
    });

    const certificate = await this.certificateRepository.findOne({
      where: { verificationCode },
      relations: ['user', 'course'],
    });

    if (!certificate) {
      log.result = VerificationResult.NOT_FOUND;
      await this.certificateVerificationLogRepository.save(log);
      throw new NotFoundException('Certificate not found');
    }

    if (certificate.isRevoked) {
      log.certificateId = certificate.id;
      log.result = VerificationResult.REVOKED;
      await this.certificateVerificationLogRepository.save(log);
      throw new BadRequestException('Certificate has been revoked');
    }

    log.certificateId = certificate.id;
    log.result = VerificationResult.VALID;
    await this.certificateVerificationLogRepository.save(log);

    return certificate;
  }

  async getCertificateDownloadUrl(
      certificateId: string,
      userId: string,
      userRoles: UserRoleLike[] = [],
  ): Promise<string> {
    this.assertUserId(userId);

    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }
    if (certificate.userId !== userId && !this.isAdmin(userRoles)) {
      throw new ForbiddenException('Cannot download this certificate');
    }

    if (!certificate.pdfS3Key) {
      throw new InternalServerErrorException('Certificate PDF not available');
    }

    // Create signed URL (valid for 1 hour)
    const signedUrl = await this.s3Service.getSignedDownloadUrl(
      certificate.pdfS3Key,
      3600,
    );

    // Create and store signed URL record for audit trail
    const tokenHash = crypto
      .createHash('sha256')
      .update(signedUrl)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    const urlRecord = this.certificateSignedUrlRepository.create({
      certificateId,
      tokenHash,
      expiresAt,
    });

    await this.certificateSignedUrlRepository.save(urlRecord);

    return signedUrl;
  }

  async revokeCertificate(
    certificateId: string,
    reason?: string,
  ): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();

    await this.certificateRepository.save(certificate);

    // Log revocation
    const log = this.certificateVerificationLogRepository.create({
      certificateId,
      result: VerificationResult.REVOKED,
    });
    await this.certificateVerificationLogRepository.save(log);

    return certificate;
  }

  private async generateCertificatePDF(
    userName: string,
    courseName: string,
    date: Date,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        doc.on('error', (err) => {
          reject(err);
        });

        // Design certificate
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .text('Certificate of Completion', { align: 'center' });
        doc.moveDown(0.5);

        doc
          .fontSize(16)
          .font('Helvetica')
          .text('SkillForge', { align: 'center' });
        doc.moveDown(1);

        doc.fontSize(12).text('This is to certify that', { align: 'center' });
        doc.moveDown(0.5);

        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#16a085')
          .text(userName, { align: 'center' });
        doc.fillColor('black').moveDown(0.5);

        doc
          .fontSize(12)
          .font('Helvetica')
          .text('has successfully completed the course:', { align: 'center' });
        doc.moveDown(0.3);

        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#16a085')
          .text(courseName, { align: 'center' });
        doc.fillColor('black').moveDown(1.5);

        doc
          .fontSize(10)
          .text(
            `Date: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
            { align: 'center' },
          );
        doc.moveDown(2);

        // Add decorative line
        doc
          .moveTo(100, doc.y)
          .lineTo(doc.page.width - 100, doc.y)
          .stroke();

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private assertUserId(userId: string | undefined): asserts userId is string {
    if (!userId) {
      throw new ForbiddenException('Authenticated user id is required');
    }
  }

  private isAdmin(userRoles: UserRoleLike[]): boolean {
    return userRoles.some((role) => {
      if (typeof role === 'string') return role === UserRoleEnum.ADMIN;
      return role.role === UserRoleEnum.ADMIN;
    });
  }

  private toPublicCertificate(
      certificate: Certificate,
  ): PublicCertificateResponse {
    return {
      id: certificate.id,
      certificateCode: certificate.certificateCode,
      userName: certificate.completionSnapshot.userName,
      courseName: certificate.completionSnapshot.courseName,
      courseLevel: certificate.completionSnapshot.courseLevel,
      issuedAt: certificate.issuedAt,
      completedAt: certificate.completionSnapshot.completedAt,
      isRevoked: certificate.isRevoked,
    };
  }

  private toSelfCertificate(certificate: Certificate): SelfCertificateResponse {
    return {
      ...this.toPublicCertificate(certificate),
      courseId: certificate.courseId,
    };
  }

  private toAdminCertificate(
      certificate: Certificate,
  ): AdminCertificateResponse {
    return {
      ...this.toSelfCertificate(certificate),
      userId: certificate.userId,
      userEmail: certificate.user?.email,
      pdfAvailable: Boolean(certificate.pdfS3Key),
      revokedAt: certificate.revokedAt,
    };
  }
}
