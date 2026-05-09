import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { Request } from 'express';
import { FinalExamSubmissionDto } from './dto/final-exam-submission.dto';

@ApiTags('Units')
@Controller('units')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UnitsController {
  constructor(private coursesService: CoursesService) {}

  @Get(':unitId')
  @ApiOperation({
    summary: 'Get unit details',
    description:
      'Retrieve complete information about a unit including lessons, exercises, and quizzes',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Unit details retrieved successfully',
    schema: {
      example: {
        id: 'unit-001',
        title: 'Getting Started with Python',
        lessons: [{ id: 'lesson-001', title: 'Variables and Data Types' }],
        exercises: 5,
        quiz: { id: 'quiz-001', questions: 10 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Unit not found',
  })
  async getUnitDetail(
    @Param('unitId') unitId: string,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.coursesService.getUnitDetail(unitId, userId);
  }

  @Post(':unitId/final-exams/:finalExamId/attempts')
  @ApiOperation({
    summary: 'Start final exam attempt',
    description: 'Initialize a new attempt for a final exam in a unit',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiParam({
    name: 'finalExamId',
    description: 'Unique identifier of the final exam',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Final exam attempt started successfully',
    schema: {
      example: {
        attemptId: 'attempt-001',
        finalExamId: 'exam-001',
        startedAt: '2024-01-20T10:30:00Z',
        timeLimit: 120,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User not enrolled in course or unit not accessible',
  })
  @ApiResponse({
    status: 404,
    description: 'Unit or final exam not found',
  })
  async startFinalExamAttempt(
    @Param('unitId') unitId: string,
    @Param('finalExamId') finalExamId: string,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.coursesService.startFinalExamAttempt(
      userId,
      unitId,
      finalExamId,
    );
  }

  @Post(':unitId/final-exams/:finalExamId/attempts/submit')
  @ApiOperation({
    summary: 'Submit final exam attempt',
    description: 'Submit completed final exam answers for grading',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiParam({
    name: 'finalExamId',
    description: 'Unique identifier of the final exam',
    type: 'string',
  })
  @ApiBody({
    type: FinalExamSubmissionDto,
    description: 'Final exam submission with answers',
  })
  @ApiResponse({
    status: 200,
    description: 'Final exam submitted successfully and graded',
    schema: {
      example: {
        attemptId: 'attempt-001',
        score: 85,
        totalQuestions: 10,
        correctAnswers: 8,
        passed: true,
        submittedAt: '2024-01-20T11:45:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid submission or no active attempt found',
  })
  @ApiResponse({
    status: 404,
    description: 'Unit, final exam, or attempt not found',
  })
  async submitFinalExamAttempt(
    @Param('unitId') unitId: string,
    @Param('finalExamId') finalExamId: string,
    @Body() dto: FinalExamSubmissionDto,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.coursesService.submitFinalExamAttempt(
      userId,
      unitId,
      finalExamId,
      dto,
    );
  }
}
