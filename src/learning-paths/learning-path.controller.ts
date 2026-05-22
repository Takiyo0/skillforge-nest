import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  getSchemaPath,
} from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import {
  JoinLearningPathResponseDto,
  LearningPathListResponseDto,
  LeaveLearningPathResponseDto,
  NoLearningPathResponseDto,
  UserLearningPathResponseDto,
} from './dto/learning-path-response.dto';

@ApiTags('Learning Paths')
@ApiExtraModels(UserLearningPathResponseDto, NoLearningPathResponseDto)
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
    type: LearningPathListResponseDto,
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
      oneOf: [
        {$ref: getSchemaPath(UserLearningPathResponseDto)},
        {$ref: getSchemaPath(NoLearningPathResponseDto)},
      ],
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

  @Post(':learningPathId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Join a learning path',
    description: 'Assign the authenticated user to a specific learning path',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning path joined successfully',
    type: JoinLearningPathResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User already has a learning path assigned',
  })
  @ApiResponse({
    status: 404,
    description: 'Learning path not found',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async joinPath(
      @CurrentUser() user: User,
      @Param('learningPathId') learningPathId: string,
  ) {
    return this.learningPathService.joinPath(user.id, learningPathId);
  }

  @Delete(':learningPathId/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Leave a learning path',
    description:
        'Remove the current learning path assignment from the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning path left successfully',
    type: LeaveLearningPathResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User is not in the specified learning path',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async leavePath(
      @CurrentUser() user: User,
      @Param('learningPathId') learningPathId: string,
  ) {
    return this.learningPathService.leavePath(user.id, learningPathId);
  }
}
