import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { SubmitCodeDto } from './dto/submit-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Exercises')
@Controller()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get('units/:unitId/exercises')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get exercises for a unit',
    description: 'Retrieve all exercises available in a specific unit',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Exercises retrieved successfully',
    schema: {
      example: {
        unitId: 'unit-001',
        exercises: [
          {
            id: 'exercise-001',
            title: 'Hello World',
            difficulty: 'easy',
            points: 100,
          },
        ],
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
  async getExerciseByUnit(@Param('unitId') unitId: string) {
    return this.exercisesService.getExerciseByUnit(unitId);
  }

  @Get('units/:unitId/exercises/:exerciseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get exercise details',
    description:
      'Retrieve detailed information and boilerplate code for an exercise',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Unique identifier of the exercise',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Exercise details retrieved successfully',
    schema: {
      example: {
        id: 'exercise-001',
        title: 'Hello World',
        description: 'Write a program that prints Hello World',
        difficulty: 'easy',
        language: 'python',
        boilerplate: 'print()',
        testCases: 5,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise or unit not found',
  })
  async getExerciseDetail(
    @Param('unitId') unitId: string,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.exercisesService.getExerciseDetail(unitId, exerciseId);
  }

  @Post('units/:unitId/exercises/:exerciseId/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Submit exercise code',
    description:
      'Submit code solution for a normal exercise and receive immediate feedback',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Unique identifier of the exercise',
    type: 'string',
  })
  @ApiBody({
    type: SubmitCodeDto,
    description: 'Code submission with solution',
  })
  @ApiResponse({
    status: 200,
    description: 'Code executed and evaluated successfully',
    schema: {
      example: {
        submissionId: 'sub-001',
        passed: true,
        testsPassed: 5,
        totalTests: 5,
        output: 'Hello World',
        executionTime: 125,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Exercise submission created and queued for evaluation',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid code or submission format',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise or unit not found',
  })
  async submitNormalExercise(
    @Param('unitId') unitId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() submitDto: SubmitCodeDto,
    @Req() req: any,
  ) {
    if (submitDto.exerciseId !== exerciseId) {
      throw new BadRequestException(
        'exerciseId in payload must match route parameter',
      );
    }

    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user id not found');
    }
    return this.exercisesService.submitNormalExercise(
      unitId,
      exerciseId,
      userId,
      submitDto,
    );
  }

  @Post('units/:unitId/exercises/:exerciseId/advanced-submissions')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Submit advanced exercise code (async)',
    description:
      'Submit code for advanced exercises with async evaluation. Returns 202 and a submission ID for polling',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'Unique identifier of the advanced exercise',
    type: 'string',
  })
  @ApiBody({
    type: SubmitCodeDto,
    description: 'Code submission with solution',
  })
  @ApiResponse({
    status: 202,
    description:
      'Advanced exercise submission accepted and queued for async evaluation',
    schema: {
      example: {
        submissionId: 'sub-advanced-001',
        status: 'processing',
        message: 'Your submission has been queued for evaluation',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid code or submission format',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Exercise or unit not found',
  })
  async submitAdvancedExercise(
    @Param('unitId') unitId: string,
    @Param('exerciseId') exerciseId: string,
    @Body() submitDto: SubmitCodeDto,
    @Req() req: any,
  ) {
    if (submitDto.exerciseId !== exerciseId) {
      throw new BadRequestException(
        'exerciseId in payload must match route parameter',
      );
    }

    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user id not found');
    }
    return this.exercisesService.submitAdvancedExercise(
      unitId,
      exerciseId,
      userId,
      submitDto,
    );
  }
}
