import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Submissions')
@Controller('submissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('unit/:unitId')
  @ApiOperation({
    summary: 'Get all submissions for a unit',
    description: 'Retrieve all code submissions by the current user for a specific unit/exercise',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Submissions retrieved successfully',
    schema: {
      example: [
        {
          id: 'sub-001',
          status: 'passed',
          kind: 'exercise_normal',
          language: 'python',
          attemptNumber: 1,
          queuedAt: '2024-01-15T10:30:00Z',
          finishedAt: '2024-01-15T10:30:05Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async getUserUnitSubmissions(
    @Param('unitId') unitId: string,
    @Req() req: any,
  ) {
    return this.submissionsService.getUserUnitSubmissions(
      unitId,
      req.user.userId,
    );
  }

  @Get(':submissionId')
  @ApiOperation({
    summary: 'Get submission status',
    description: 'Retrieve the current status and results of a code submission',
  })
  @ApiParam({
    name: 'submissionId',
    description: 'Unique identifier of the submission',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission status retrieved successfully',
    schema: {
      example: {
        submissionId: 'sub-001',
        status: 'completed',
        passed: true,
        testsPassed: 5,
        totalTests: 5,
        output: 'All tests passed!',
        executionTime: 125,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to view this submission',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found',
  })
  async getSubmissionStatus(
    @Param('submissionId') submissionId: string,
    @Req() req: any,
  ) {
    return this.submissionsService.getSubmissionStatus(
      submissionId,
      req.user.userId,
    );
  }

  @Get(':submissionId/feedback')
  @ApiOperation({
    summary: 'Get submission feedback',
    description:
      'Retrieve detailed feedback and AI-generated code review for a submission',
  })
  @ApiParam({
    name: 'submissionId',
    description: 'Unique identifier of the submission',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission feedback retrieved successfully',
    schema: {
      example: {
        submissionId: 'sub-001',
        feedback: {
          summary: 'Good solution with efficient logic',
          issues: [
            {
              severity: 'warning',
              message: 'Consider adding comments to explain the algorithm',
            },
          ],
          suggestions: [
            {
              type: 'optimization',
              message: 'Use list comprehension for cleaner code',
            },
          ],
        },
        aiReview: {
          codeQuality: 'good',
          efficiency: 'excellent',
          readability: 'good',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to view this submission',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found or feedback not yet available',
  })
  async getSubmissionFeedback(
    @Param('submissionId') submissionId: string,
    @Req() req: any,
  ) {
    return this.submissionsService.getSubmissionFeedback(
      submissionId,
      req.user.userId,
    );
  }
}
