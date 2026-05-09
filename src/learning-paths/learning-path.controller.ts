import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Learning Paths')
@Controller('learning-paths')
export class LearningPathController {
  constructor(private learningPathService: LearningPathService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all learning paths',
    description: 'Retrieve all available learning paths in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning paths retrieved successfully',
    schema: {
      example: {
        paths: [
          {
            id: 'path-001',
            name: 'Web Development Fundamentals',
            description: 'Learn HTML, CSS, and JavaScript basics',
            courses: 5,
            duration: '12 weeks',
          },
        ],
      },
    },
  })
  async getAllPaths() {
    return this.learningPathService.getAllPaths();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user learning path',
    description:
      'Retrieve the learning path assigned to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User learning path retrieved successfully',
    schema: {
      example: {
        pathId: 'path-001',
        name: 'Web Development Fundamentals',
        progress: 45,
        courses: [
          {
            id: 'course-001',
            title: 'HTML Basics',
            completed: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'No learning path assigned',
    schema: {
      example: {
        message: 'No learning path assigned',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async getUserPath(@CurrentUser() user: User) {
    const path = await this.learningPathService.getUserPath(user.id);
    return path || { message: 'No learning path assigned' };
  }
}
