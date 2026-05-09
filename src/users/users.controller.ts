import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../common/upload-limits';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('users/:userId')
  @ApiOperation({
    summary: 'Get public user profile',
    description: 'Retrieve publicly visible profile information for a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Public profile retrieved successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        displayName: 'John Doe',
        avatar: 'https://s3.example.com/avatars/user-123.jpg',
        bio: 'Passionate about coding',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getPublicProfile(@Param('userId') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Retrieve the authenticated user's complete profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        displayName: 'John Doe',
        avatar: 'https://s3.example.com/avatars/user-123.jpg',
        bio: 'Passionate about coding',
        totalXP: 5250,
        level: 12,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @UseInterceptors(FileInterceptor('avatar', multerOptions('image')))
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update user profile information including optional avatar upload',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'John Doe' },
        bio: { type: 'string', example: 'Passionate about coding' },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (JPG, PNG, GIF)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        displayName: 'John Doe',
        bio: 'Passionate about coding',
        avatar: 'https://s3.example.com/avatars/user-123.jpg',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or invalid image file',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    if (avatar && !avatar.mimetype.startsWith('image/')) {
      throw new BadRequestException('Uploaded file must be an image');
    }

    return this.usersService.updateProfile(user.id, updateProfileDto, avatar);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update user preferences',
    description:
      'Update user preferences such as theme, notifications, and language settings',
  })
  @ApiBody({
    type: UpdatePreferencesDto,
    description: 'User preference settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    schema: {
      example: {
        theme: 'dark',
        emailNotifications: true,
        language: 'en',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid preference values',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, updatePreferencesDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/xp')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user XP summary',
    description:
      'Retrieve experience points (XP) summary for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'XP summary retrieved successfully',
    schema: {
      example: {
        totalXP: 5250,
        level: 12,
        currentLevelXP: 250,
        nextLevelXP: 1000,
        xpToNextLevel: 750,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async getXpSummary(@CurrentUser() user: User) {
    return this.usersService.getXpSummary(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/badges')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user badges',
    description: 'Retrieve all earned badges for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User badges retrieved successfully',
    schema: {
      example: {
        badges: [
          {
            id: 'badge-001',
            name: 'First Steps',
            description: 'Complete your first exercise',
            earnedAt: '2024-01-15T10:30:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async getBadges(@CurrentUser() user: User) {
    return this.usersService.getBadges(user.id);
  }
}
