import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRoleEnum } from '../entities';
import { ForumService } from './forum.service';
import {
  CreateForumPostDto,
  CreateForumReplyDto,
  UpdateForumPostStatusDto,
  UpdateForumReplyStatusDto,
} from './dto/forum.dto';

@ApiTags('Forum')
@Controller('forums')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  /**
   * GET /forums/me
   * Get all forums the user is involved with (created or replied to)
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get user forums',
    description:
      'Retrieve all forums the authenticated user is involved with (created or replied to)',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for pagination',
    required: false,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of forums per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'User forums retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'post-001',
            title: 'How to use recursion?',
            type: 'post',
            replies: 3,
            lastActivity: '2024-01-20T10:30:00Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 15,
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
  async getUserForums(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user.id;
    return this.forumService.getUserForums(userId, page, limit);
  }

  /**
   * GET /forums/courses/{courseId}/posts
   * List all visible forum posts for a course
   */
  @Get('courses/:courseId/posts')
  @ApiOperation({
    summary: 'List posts for course',
    description: 'Retrieve all visible forum posts for a specific course',
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
    description: 'Number of posts per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Course posts retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'post-001',
            title: 'How to use recursion?',
            author: 'John Doe',
            replies: 3,
            createdAt: '2024-01-20T10:30:00Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 45,
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
    description: 'Invalid pagination parameters or course ID',
  })
  async listPostsForCourse(
    @Param('courseId') courseId: string,
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r: any) => r.role || r);
    return this.forumService.listPostsForCourse(
      courseId,
      userId,
      userRoles,
      Number(page),
      Number(limit),
    );
  }

  /**
   * GET /forums/posts/{postId}
   * Get a single forum post with metadata
   */
  @Get('posts/:postId')
  @ApiOperation({
    summary: 'Get forum post',
    description:
      'Retrieve a single forum post with metadata and visibility checks',
  })
  @ApiParam({
    name: 'postId',
    description: 'Unique identifier of the post',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Forum post retrieved successfully',
    schema: {
      example: {
        id: 'post-001',
        title: 'How to use recursion?',
        content: 'I am trying to understand recursion...',
        author: 'John Doe',
        createdAt: '2024-01-20T10:30:00Z',
        replies: 3,
        status: 'active',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'Post is hidden or user lacks permission to view',
  })
  @ApiResponse({
    status: 404,
    description: 'Forum post not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid post ID format',
  })
  async getPost(@Param('postId') postId: string, @Request() req) {
    const userId = req.user?.id;
    const userRoles = (req.user?.roles || []).map((r: any) => r.role || r);
    return this.forumService.getPost(postId, userId, userRoles);
  }

  /**
   * POST /forums/posts
   * Create a new forum post
   */
  @Post('posts')
  @ApiOperation({
    summary: 'Create forum post',
    description: 'Create a new forum post in a course',
  })
  @ApiBody({
    type: CreateForumPostDto,
    description: 'Forum post creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'Forum post created successfully',
    schema: {
      example: {
        id: 'post-001',
        title: 'How to use recursion?',
        courseId: 'course-001',
        author: 'John Doe',
        createdAt: '2024-01-20T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid post data or user not enrolled in course',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid post data (validation failed)',
  })
  async createPost(@Request() req, @Body() dto: CreateForumPostDto) {
    const userId = req.user.id;
    return this.forumService.createPost(userId, dto);
  }

  /**
   * GET /forums/posts/{postId}/replies
   * Get all replies for a post (with nested thread support)
   */
  @Get('posts/:postId/replies')
  @ApiOperation({
    summary: 'Get post replies',
    description:
      'Retrieve all replies for a forum post with nested thread support',
  })
  @ApiParam({
    name: 'postId',
    description: 'Unique identifier of the post',
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
    description: 'Number of replies per page',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Post replies retrieved successfully',
    schema: {
      example: {
        postId: 'post-001',
        replies: [
          {
            id: 'reply-001',
            content: 'Recursion is when a function calls itself...',
            author: 'Jane Doe',
            createdAt: '2024-01-20T10:45:00Z',
            nestedReplies: 2,
          },
        ],
        page: 1,
        limit: 50,
        total: 8,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid pagination parameters or post ID',
  })
  async getRepliesForPost(
    @Param('postId') postId: string,
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r: any) => r.role || r);
    return this.forumService.getRepliesForPost(
      postId,
      userId,
      userRoles,
      Number(page),
      Number(limit),
    );
  }

  /**
   * POST /forums/replies
   * Create a reply to a post or another reply
   */
  @Post('replies')
  @ApiOperation({
    summary: 'Create forum reply',
    description:
      'Create a reply to a forum post or another reply (nested comments)',
  })
  @ApiBody({
    type: CreateForumReplyDto,
    description: 'Forum reply creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'Forum reply created successfully',
    schema: {
      example: {
        id: 'reply-001',
        postId: 'post-001',
        content: 'Recursion is when a function calls itself...',
        author: 'John Doe',
        createdAt: '2024-01-20T10:45:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reply data or post/parent reply not found',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid reply data (validation failed)',
  })
  async createReply(@Request() req, @Body() dto: CreateForumReplyDto) {
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r: any) => r.role || r);
    return this.forumService.createReply(userId, dto, userRoles);
  }

  /**
   * PUT /forums/posts/{postId}/status
   * Update post status (hide/unhide/lock/unlock/delete) - INSTRUCTOR ONLY
   */
  @Put('posts/:postId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Update post status (instructor only)',
    description:
      'Update forum post status: hide, unhide, lock, unlock, or delete (instructor/admin only)',
  })
  @ApiParam({
    name: 'postId',
    description: 'Unique identifier of the post',
    type: 'string',
  })
  @ApiBody({
    type: UpdateForumPostStatusDto,
    description: 'Post status update',
  })
  @ApiResponse({
    status: 200,
    description: 'Post status updated successfully',
    schema: {
      example: {
        id: 'post-001',
        status: 'hidden',
        reason: 'Inappropriate content',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks instructor/admin privileges',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid post status or request data',
  })
  async updatePostStatus(
    @Param('postId') postId: string,
    @Request() req,
    @Body() dto: UpdateForumPostStatusDto,
  ) {
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r: any) => r.role || r);
    return this.forumService.updatePostStatus(postId, userId, userRoles, dto);
  }

  /**
   * PUT /forums/replies/{replyId}/status
   * Update reply status (hide/unhide/lock/unlock/delete) - INSTRUCTOR ONLY
   */
  @Put('replies/:replyId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
  @ApiOperation({
    summary: 'Update reply status (instructor only)',
    description:
      'Update forum reply status: hide, unhide, lock, unlock, or delete (instructor/admin only)',
  })
  @ApiParam({
    name: 'replyId',
    description: 'Unique identifier of the reply',
    type: 'string',
  })
  @ApiBody({
    type: UpdateForumReplyStatusDto,
    description: 'Reply status update',
  })
  @ApiResponse({
    status: 200,
    description: 'Reply status updated successfully',
    schema: {
      example: {
        id: 'reply-001',
        status: 'hidden',
        reason: 'Offensive language',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks instructor/admin privileges',
  })
  @ApiResponse({
    status: 404,
    description: 'Reply not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid reply status or request data',
  })
  async updateReplyStatus(
    @Param('replyId') replyId: string,
    @Request() req,
    @Body() dto: UpdateForumReplyStatusDto,
  ) {
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r: any) => r.role || r);
    return this.forumService.updateReplyStatus(replyId, userId, userRoles, dto);
  }

  /**
   * DELETE /forums/posts/{postId}
   * Delete a post (author or instructor/admin)
   */
  @Delete('posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete forum post',
    description: 'Delete a forum post (author, instructor, or admin only)',
  })
  @ApiParam({
    name: 'postId',
    description: 'Unique identifier of the post to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Forum post deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not post author or lacks instructor/admin privileges',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid post ID format',
  })
  async deletePost(@Param('postId') postId: string, @Request() req) {
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r: any) => r.role || r);
    await this.forumService.deletePost(postId, userId, userRoles);
  }

  /**
   * DELETE /forums/replies/{replyId}
   * Delete a reply (author or instructor/admin)
   */
  @Delete('replies/:replyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete forum reply',
    description: 'Delete a forum reply (author, instructor, or admin only)',
  })
  @ApiParam({
    name: 'replyId',
    description: 'Unique identifier of the reply to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Forum reply deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 403,
    description:
      'User is not reply author or lacks instructor/admin privileges',
  })
  @ApiResponse({
    status: 404,
    description: 'Reply not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid reply ID format',
  })
  async deleteReply(@Param('replyId') replyId: string, @Request() req) {
    const userId = req.user.id;
    const userRoles = (req.user.roles || []).map((r: any) => r.role || r);
    await this.forumService.deleteReply(replyId, userId, userRoles);
  }
}
