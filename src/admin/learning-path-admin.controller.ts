import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LearningPathAdminService } from './learning-path-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';
import { AddCoursesToPathDto } from './dto/add-courses-to-path.dto';

@Controller('admin/learning-paths')
@UseGuards(JwtAuthGuard, AdminGuard)
export class LearningPathAdminController {
  constructor(private learningPathAdminService: LearningPathAdminService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create learning path',
    description:
      'Create a new learning path with courses. Requires admin authentication.',
  })
  @ApiBody({
      description:
          'Learning path details including title, description, and criteria',
    type: CreateLearningPathDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Learning path created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation failed',
  })
  async createPath(@Body() dto: CreateLearningPathDto) {
    return this.learningPathAdminService.createPath(dto);
  }

  @Get()
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List all learning paths',
      description:
          'Retrieve a list of all learning paths. Requires admin authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of learning paths retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  async getAllPaths() {
    return this.learningPathAdminService.getAllPaths();
  }

  @Get(':pathId')
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get learning path details',
    description:
      'Retrieve detailed information about a specific learning path. Requires admin authentication.',
  })
  @ApiParam({
    name: 'pathId',
    description: 'The unique identifier of the learning path',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Learning path details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Learning path with specified ID does not exist',
  })
  async getPath(@Param('pathId') pathId: string) {
    return this.learningPathAdminService.getPath(pathId);
  }

  @Patch(':pathId')
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update learning path',
    description:
      'Update details of an existing learning path. Requires admin authentication.',
  })
  @ApiParam({
    name: 'pathId',
    description: 'The unique identifier of the learning path to update',
    type: String,
  })
  @ApiBody({
    description: 'Updated learning path details',
    type: UpdateLearningPathDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Learning path updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Learning path with specified ID does not exist',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation failed',
  })
  async updatePath(
    @Param('pathId') pathId: string,
    @Body() dto: UpdateLearningPathDto,
  ) {
    return this.learningPathAdminService.updatePath(pathId, dto);
  }

  @Delete(':pathId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete learning path',
    description:
      'Permanently delete a learning path. This action cannot be undone. Requires admin authentication.',
  })
  @ApiParam({
    name: 'pathId',
    description: 'The unique identifier of the learning path to delete',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Learning path deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Learning path with specified ID does not exist',
  })
  async deletePath(@Param('pathId') pathId: string) {
    return this.learningPathAdminService.deletePath(pathId);
  }

  @Post(':pathId/courses')
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Add courses to learning path',
    description:
      'Add one or more courses to an existing learning path. Requires admin authentication.',
  })
  @ApiParam({
    name: 'pathId',
    description: 'The unique identifier of the learning path',
    type: String,
  })
  @ApiBody({
    description: 'Array of course IDs to add to the learning path',
    type: AddCoursesToPathDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Courses added to learning path successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid course IDs or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  @ApiResponse({
    status: 404,
      description:
          'Not Found - Learning path or one of the courses does not exist',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation failed',
  })
  async addCoursesToPath(
    @Param('pathId') pathId: string,
    @Body() dto: AddCoursesToPathDto,
  ) {
    return this.learningPathAdminService.addCoursesToPath(pathId, dto);
  }

  @Delete(':pathId/courses/:courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Remove course from learning path',
    description:
      'Remove a course from a learning path. Requires admin authentication.',
  })
  @ApiParam({
    name: 'pathId',
    description: 'The unique identifier of the learning path',
    type: String,
  })
  @ApiParam({
    name: 'courseId',
    description: 'The unique identifier of the course to remove',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Course removed from learning path successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Learning path or course does not exist',
  })
  async removeCourseFromPath(
    @Param('pathId') pathId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.learningPathAdminService.removeCourseFromPath(pathId, courseId);
  }

  @Patch(':pathId/courses/reorder')
  @ApiTags('Admin - Learning Paths')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reorder courses in learning path',
    description:
      'Reorder courses within a learning path to define the sequence in which learners should follow them. Requires admin authentication.',
  })
  @ApiParam({
    name: 'pathId',
    description: 'The unique identifier of the learning path',
    type: String,
  })
  @ApiBody({
    description: 'Array of course IDs in the desired order',
    schema: {
      type: 'object',
      properties: {
        courseIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered array of course IDs',
        },
      },
      required: ['courseIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Courses reordered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid course IDs or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication token is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin permissions',
  })
  @ApiResponse({
    status: 404,
      description:
          'Not Found - Learning path or one of the courses does not exist',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation failed',
  })
  async reorderCourses(
    @Param('pathId') pathId: string,
    @Body() dto: { courseIds: string[] },
  ) {
    return this.learningPathAdminService.reorderCourses(pathId, dto.courseIds);
  }
}
