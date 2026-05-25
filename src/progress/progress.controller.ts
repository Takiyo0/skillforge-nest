import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { ProgressService } from './progress.service';
import { StreaksService } from './streaks.service';
import { ShowcaseService } from './showcase.service';
import { CreateShowcaseDto, UpdateShowcaseDto } from './dto/showcase.dto';

@ApiTags('Progress')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ProgressController {
  constructor(
    private progressService: ProgressService,
    private streaksService: StreaksService,
    private showcaseService: ShowcaseService,
  ) {}

  @Post('me/courses/:courseId/enroll')
  @ApiOperation({
    summary: 'Enroll in course',
    description: 'Enroll the authenticated user in a specific course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Unique identifier of the course to enroll in',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'User enrolled in course successfully',
    schema: {
      example: {
        courseId: 'course-001',
        courseName: 'Python Basics',
        enrolledAt: '2024-01-20T10:30:00Z',
        progress: 0,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User already enrolled or invalid course',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async enrollInCourse(
    @CurrentUser() user: User,
    @Param('courseId') courseId: string,
  ) {
    return this.progressService.enrollInCourse(user.id, courseId);
  }

  @Get('me/courses/:courseId/progress')
  @ApiOperation({
    summary: 'Get course progress',
    description:
      "Retrieve the authenticated user's progress in a specific course",
  })
  @ApiParam({
    name: 'courseId',
    description: 'Unique identifier of the course',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Course progress retrieved successfully',
    schema: {
      example: {
        courseId: 'course-001',
        courseName: 'Python Basics',
        progress: 45,
        unitsCompleted: 4,
        totalUnits: 8,
        lastAccessed: '2024-01-20T10:30:00Z',
        xpEarned: 450,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Course or enrollment not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid course ID format',
  })
  async getCourseProgress(
    @CurrentUser() user: User,
    @Param('courseId') courseId: string,
  ) {
    return this.progressService.getCourseProgress(user.id, courseId);
  }

  @Post('me/units/:unitId/start')
  @ApiOperation({
    summary: 'Start unit',
    description: 'Mark a unit as started for the authenticated user',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit to start',
    type: 'string',
  })
  @ApiResponse({
    status: 201,
    description: 'Unit started successfully',
    schema: {
      example: {
        unitId: 'unit-001',
        unitName: 'Getting Started',
        startedAt: '2024-01-20T10:30:00Z',
        progress: 0,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Unit already started or user not enrolled',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Unit not found',
  })
  async startUnit(@CurrentUser() user: User, @Param('unitId') unitId: string) {
    return this.progressService.startUnit(user.id, unitId);
  }

  @Post('me/units/:unitId/complete')
  @ApiOperation({
    summary: 'Complete unit',
    description: 'Mark a unit as completed for the authenticated user',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit to complete',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Unit completed successfully',
    schema: {
      example: {
        unitId: 'unit-001',
        unitName: 'Getting Started',
        completedAt: '2024-01-20T12:30:00Z',
        xpEarned: 150,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Unit requirements not met or already completed',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Unit not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid unit ID format',
  })
  async completeUnit(
    @CurrentUser() user: User,
    @Param('unitId') unitId: string,
  ) {
    return this.progressService.completeUnit(user.id, unitId);
  }

  @Get('me/streak')
  @ApiOperation({
    summary: 'Get user streak',
    description: "Retrieve the authenticated user's current learning streak",
  })
  @ApiResponse({
    status: 200,
    description: 'User streak retrieved successfully',
    schema: {
      example: {
        currentStreak: 15,
        longestStreak: 42,
        lastActivityDate: '2024-01-20',
        totalXpThisWeek: 1250,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async getMyStreak(@CurrentUser() user: User) {
    return this.streaksService.getUserStreak(user.id);
  }

  @Post('me/showcases')
  @ApiOperation({
    summary: 'Create showcase',
    description: 'Create a new project showcase for a completed course',
  })
  @ApiBody({
    type: CreateShowcaseDto,
    description: 'Showcase creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'Showcase created successfully',
    schema: {
      example: {
        id: 'showcase-001',
        title: 'My First Web App',
        courseId: 'course-001',
        createdAt: '2024-01-20T10:30:00Z',
        isPublic: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid showcase data or course not completed',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid showcase data (validation failed)',
  })
  async createShowcase(
    @CurrentUser() user: User,
    @Body() createShowcaseDto: CreateShowcaseDto,
  ) {
    return this.showcaseService.createShowcase(
      user.id,
      createShowcaseDto.courseId,
      createShowcaseDto,
    );
  }

  @Get('me/showcases/:showcaseId')
  @ApiOperation({
    summary: 'Get user showcase',
    description:
      'Retrieve a specific showcase created by the authenticated user',
  })
  @ApiParam({
    name: 'showcaseId',
    description: 'Unique identifier of the showcase',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Showcase retrieved successfully',
    schema: {
      example: {
        id: 'showcase-001',
        title: 'My First Web App',
        description: 'A todo list application built with React',
        projectUrl: 'https://github.com/user/project',
        courseId: 'course-001',
        createdAt: '2024-01-20T10:30:00Z',
        views: 125,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'Showcase belongs to another user',
  })
  @ApiResponse({
    status: 404,
    description: 'Showcase not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid showcase ID format',
  })
  async getMyShowcase(
    @CurrentUser() user: User,
    @Param('showcaseId') showcaseId: string,
  ) {
    return this.showcaseService.getUserShowcase(user.id, showcaseId);
  }

  @Get('showcases/public')
  @ApiOperation({
    summary: 'Get public showcases',
    description:
      'Retrieve publicly shared showcases from all users with pagination',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of showcases per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Public showcases retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'showcase-001',
            title: 'My First Web App',
            author: 'Alice',
            courseName: 'Web Development',
            views: 125,
            createdAt: '2024-01-20T10:30:00Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 45,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid pagination parameters',
  })
  async getPublicShowcases(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.showcaseService.getPublicShowcases(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('users/:userId/showcases')
  @ApiOperation({
    summary: 'Get user showcases',
    description: 'Retrieve public showcases for a specific user',
  })
  @ApiParam({
    name: 'userId',
    description: 'Unique identifier of the user',
    type: 'string',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of showcases per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'User showcases retrieved successfully',
    schema: {
      example: {
        userId: 'user-001',
        username: 'Alice',
        showcases: [
          {
            id: 'showcase-001',
            title: 'My First Web App',
            courseName: 'Web Development',
            views: 125,
            createdAt: '2024-01-20T10:30:00Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 5,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid user ID or pagination parameters',
  })
  async getUserShowcases(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.showcaseService.getUserShowcases(
      userId,
      currentUser?.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('courses/:courseId/showcases')
  @ApiOperation({
    summary: 'Get course showcases',
    description: 'Retrieve all public showcases for a specific course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Unique identifier of the course',
    type: 'string',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of showcases per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Course showcases retrieved successfully',
    schema: {
      example: {
        courseId: 'course-001',
        courseName: 'Web Development',
        showcases: [
          {
            id: 'showcase-001',
            title: 'My First Web App',
            author: 'Alice',
            views: 125,
            createdAt: '2024-01-20T10:30:00Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 32,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid course ID or pagination parameters',
  })
  async getCourseShowcases(
    @Param('courseId') courseId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.showcaseService.getCourseShowcases(
      courseId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Patch('me/showcases/:showcaseId')
  @ApiOperation({
    summary: 'Update showcase',
    description: 'Update a showcase created by the authenticated user',
  })
  @ApiParam({
    name: 'showcaseId',
    description: 'Unique identifier of the showcase to update',
    type: 'string',
  })
  @ApiBody({
    type: UpdateShowcaseDto,
    description: 'Updated showcase information',
  })
  @ApiResponse({
    status: 200,
    description: 'Showcase updated successfully',
    schema: {
      example: {
        id: 'showcase-001',
        title: 'My Updated Web App',
        description: 'Updated description',
        isPublic: false,
        updatedAt: '2024-01-20T15:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'Showcase belongs to another user',
  })
  @ApiResponse({
    status: 404,
    description: 'Showcase not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid showcase data (validation failed)',
  })
  async updateShowcase(
    @CurrentUser() user: User,
    @Param('showcaseId') showcaseId: string,
    @Body() updateShowcaseDto: UpdateShowcaseDto,
  ) {
    return this.showcaseService.updateShowcase(
      user.id,
      showcaseId,
      updateShowcaseDto,
    );
  }

  @Delete('me/showcases/:showcaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete showcase',
    description: 'Delete a showcase created by the authenticated user',
  })
  @ApiParam({
    name: 'showcaseId',
    description: 'Unique identifier of the showcase to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Showcase deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'Showcase belongs to another user',
  })
  @ApiResponse({
    status: 404,
    description: 'Showcase not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid showcase ID format',
  })
  async deleteShowcase(
    @CurrentUser() user: User,
    @Param('showcaseId') showcaseId: string,
  ) {
    await this.showcaseService.deleteShowcase(user.id, showcaseId);
    return { message: 'Showcase deleted successfully' };
  }
}
