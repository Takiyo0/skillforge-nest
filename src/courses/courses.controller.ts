import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { ListCoursesDto } from './dto/list-courses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

export const OptionalJwtAuthGuard = () => UseGuards(OptionalJwtGuard);

class OptionalJwtGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @OptionalJwtAuthGuard()
  @ApiOperation({
    summary: 'List all courses',
    description:
      'Retrieve a paginated list of all available courses with optional filters. Authentication is optional.',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of courses per page',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'search',
    description: 'Search term to filter courses by title or description',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'course-001',
            title: 'Python Basics',
            description: 'Learn Python programming from scratch',
            level: 'beginner',
            enrolled: false,
          },
        ],
        page: 1,
        limit: 10,
        total: 25,
      },
    },
  })
  async listCourses(
    @Query() listCoursesDto: ListCoursesDto,
    @Req() req: Request & { user?: any },
  ) {
    const userId = req.user?.id;
    return this.coursesService.listCourses(listCoursesDto, userId);
  }

  @Get('enrolled')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List enrolled courses',
    description:
      'Retrieve all courses the authenticated user is currently enrolled in',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of courses per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrolled courses retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'course-001',
            title: 'Python Basics',
            progress: 45,
            lastAccessed: '2024-01-20T10:30:00Z',
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
  async listEnrolledCourses(
    @Query() listCoursesDto: ListCoursesDto,
    @Req() req: Request & { user: any },
  ) {
    return this.coursesService.listEnrolledCourses(req.user.id, listCoursesDto);
  }

  @Get(':courseId')
  @ApiOperation({
    summary: 'Get course details',
    description: 'Retrieve detailed information about a specific course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Unique identifier of the course',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Course details retrieved successfully',
    schema: {
      example: {
        id: 'course-001',
        title: 'Python Basics',
        description: 'Learn Python programming from scratch',
        level: 'beginner',
        duration: '8 weeks',
        instructor: 'John Doe',
        units: 8,
        totalXP: 1000,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getCourseDetail(@Param('courseId') courseId: string) {
    return this.coursesService.getCourseDetail(courseId);
  }

  @Get(':courseId/units')
  @ApiOperation({
    summary: 'Get course units',
    description: 'Retrieve all units and lessons for a specific course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Unique identifier of the course',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Course units retrieved successfully',
    schema: {
      example: {
        courseId: 'course-001',
        units: [
          {
            id: 'unit-001',
            title: 'Getting Started',
            lessons: 5,
            completed: false,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getCourseUnits(@Param('courseId') courseId: string) {
    return this.coursesService.getCourseUnits(courseId);
  }
}
