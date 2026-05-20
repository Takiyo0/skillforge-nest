import {
  Controller,
  Get,
  Post,
  Param,
  BadRequestException,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificateService } from './certificate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {AdminGuard} from '../auth/guards/admin.guard';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificateController {
  constructor(private certificateService: CertificateService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List user certificates',
    description: 'Retrieve all certificates earned by the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of certificates per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificates retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'cert-001',
            certificateCode: 'CERT-2024-001',
            courseName: 'Python Basics',
            completedAt: '2024-01-15T10:30:00Z',
          },
        ],
        total: 5,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async listMyCertificates(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.certificateService.listUserCertificates(
      req.user.id,
      page,
      limit,
    );
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List all certificates (admin)',
    description: 'Retrieve all certificates in the system (admin only)',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of certificates per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'All certificates retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'cert-001',
            userName: 'John Doe',
            courseName: 'Python Basics',
            issuedAt: '2024-01-15T10:30:00Z',
          },
        ],
        total: 150,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated or lacks admin privileges',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have admin privileges',
  })
  async listAllCertificates(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.certificateService.listAllCertificates(page, limit);
  }

  @Get('verify')
  @ApiOperation({
    summary: 'Verify certificate',
    description:
      'Verify a certificate using its verification code (public endpoint)',
  })
  @ApiQuery({
    name: 'code',
    description: 'Certificate verification code',
    required: true,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate verified successfully',
    schema: {
      example: {
        isValid: true,
        certificate: {
          id: 'cert-001',
          certificateCode: 'CERT-2024-001',
          userName: 'John Doe',
          courseName: 'Python Basics',
          courseLevel: 'beginner',
          issuedAt: '2024-01-15T10:30:00Z',
          completedAt: '2024-01-15T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate verification failed',
    schema: {
      example: {
        isValid: false,
        message: 'Certificate not found or expired',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Verification code is required',
  })
  async verifyCertificate(
    @Query('code') verificationCode: string,
    @Request() req: any,
  ): Promise<{ isValid: boolean; certificate?: any; message?: string }> {
    if (!verificationCode) {
      throw new BadRequestException('Verification code is required');
    }

    try {
      const certificate = await this.certificateService.verifyCertificate(
        verificationCode,
        req.ip,
        req.get('user-agent'),
      );

      return {
        isValid: true,
        certificate: {
          id: certificate.id,
          certificateCode: certificate.certificateCode,
          userName: certificate.completionSnapshot.userName,
          courseName: certificate.completionSnapshot.courseName,
          courseLevel: certificate.completionSnapshot.courseLevel,
          issuedAt: certificate.issuedAt,
          completedAt: certificate.completionSnapshot.completedAt,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message || 'Invalid certificate',
      };
    }
  }

  @Get(':certificateId')
  @ApiOperation({
    summary: 'Get certificate details',
    description:
      'Retrieve detailed information about a specific certificate (public endpoint)',
  })
  @ApiParam({
    name: 'certificateId',
    description: 'Unique identifier of the certificate',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate details retrieved successfully',
    schema: {
      example: {
        id: 'cert-001',
        certificateCode: 'CERT-2024-001',
        userName: 'John Doe',
        courseName: 'Python Basics',
        issuedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  async getCertificate(
    @Param('certificateId') certificateId: string,
  ) {
    return this.certificateService.getCertificate(certificateId);
  }

  @Get('user/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user certificate for course',
    description:
      'Retrieve certificate for authenticated user for a specific course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Unique identifier of the course',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'User course certificate retrieved successfully',
    schema: {
      example: {
        id: 'cert-001',
        certificateCode: 'CERT-2024-001',
        courseName: 'Python Basics',
        completedAt: '2024-01-15T10:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found for user or course',
  })
  async getUserCertificate(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ) {
    return this.certificateService.getUserCourseCertificate(
      req.user?.id,
      courseId,
    );
  }

  @Get(':certificateId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get certificate download URL',
    description:
        'Generate a signed download URL for a certificate PDF owned by the authenticated user or an admin',
  })
  @ApiParam({
    name: 'certificateId',
    description: 'Unique identifier of the certificate',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      example: {
        downloadUrl:
          'https://s3.example.com/certificates/cert-001.pdf?token=xyz',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  async getDownloadUrl(
    @Param('certificateId') certificateId: string,
    @Request() req: any,
  ): Promise<{ downloadUrl: string }> {
    const downloadUrl = await this.certificateService.getCertificateDownloadUrl(
        certificateId,
        req.user?.id,
        req.user?.roles || [],
    );
    return { downloadUrl };
  }

  @Post(':certificateId/revoke')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Revoke certificate',
    description: 'Revoke an issued certificate (admin only)',
  })
  @ApiParam({
    name: 'certificateId',
    description: 'Unique identifier of the certificate to revoke',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate revoked successfully',
    schema: {
      example: {
        message: 'Certificate revoked successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated or lacks admin privileges',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  async revokeCertificate(
    @Param('certificateId') certificateId: string,
  ): Promise<{ message: string }> {
    await this.certificateService.revokeCertificate(certificateId);
    return { message: 'Certificate revoked successfully' };
  }
}
