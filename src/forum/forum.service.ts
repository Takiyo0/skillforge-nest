import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ForumPost,
  ForumReply,
  ForumModerationAction,
  Course,
  ForumEntityStatus,
  ModerationTargetType,
  ModerationActionType,
  UserRoleEnum,
} from '../entities';
import {
  CreateForumPostDto,
  CreateForumReplyDto,
  UpdateForumPostStatusDto,
  UpdateForumReplyStatusDto,
} from './dto/forum.dto';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumPost)
    private postRepository: Repository<ForumPost>,
    @InjectRepository(ForumReply)
    private replyRepository: Repository<ForumReply>,
    @InjectRepository(ForumModerationAction)
    private moderationRepository: Repository<ForumModerationAction>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async listPostsForCourse(
    courseId: string,
    userId: string,
    userRoles: UserRoleEnum[],
    page: number = 1,
    limit: number = 20,
  ) {
    const isModerator = await this.isCourseModerator(
      courseId,
      userId,
      userRoles,
    );
    const skip = (page - 1) * limit;

    const postsQuery = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.replies', 'replies')
      .where('post.courseId = :courseId', { courseId })
      .orderBy('post.isPinned', 'DESC')
      .addOrderBy('post.lastActivityAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (isModerator) {
      postsQuery.andWhere('post.status != :deletedStatus', {
        deletedStatus: ForumEntityStatus.DELETED,
      });
    } else {
      postsQuery.andWhere(
        '(post.status IN (:...publicStatuses) OR (post.status = :hiddenStatus AND post.authorId = :userId))',
        {
          publicStatuses: [ForumEntityStatus.VISIBLE, ForumEntityStatus.LOCKED],
          hiddenStatus: ForumEntityStatus.HIDDEN,
          userId,
        },
      );
    }

    const [posts, total] = await postsQuery.getManyAndCount();

    return {
      data: posts.map((post) =>
        this.formatPostResponse(post, userId, isModerator),
      ),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getPost(
    postId: string,
    userId?: string,
    userRoles: UserRoleEnum[] = [],
  ) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author', 'course', 'replies'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status === ForumEntityStatus.DELETED) {
      throw new NotFoundException('Post has been deleted');
    }

    const isModerator = userId
      ? await this.isCourseModerator(post.courseId, userId, userRoles)
      : false;

    if (post.status === ForumEntityStatus.HIDDEN && userId) {
      if (!isModerator && post.authorId !== userId) {
        throw new NotFoundException('Post not found');
      }
    }

    return this.formatPostResponse(post, userId, isModerator);
  }

  async createPost(userId: string, dto: CreateForumPostDto) {
    const post = this.postRepository.create({
      courseId: dto.courseId,
      authorId: userId,
      title: dto.title,
      body: dto.content,
      status: ForumEntityStatus.VISIBLE,
      lastActivityAt: new Date(),
    });

    const saved = await this.postRepository.save(post);

    return this.getPost(saved.id);
  }

  async getRepliesForPost(
    postId: string,
    userId: string,
    userRoles: UserRoleEnum[],
    page: number = 1,
    limit: number = 50,
  ) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['course'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status === ForumEntityStatus.DELETED) {
      throw new NotFoundException('Post not found');
    }

    const isModerator = await this.isCourseModerator(
      post.courseId,
      userId,
      userRoles,
    );

    if (
      post.status === ForumEntityStatus.HIDDEN &&
      !isModerator &&
      post.authorId !== userId
    ) {
      throw new NotFoundException('Post not found');
    }

    const skip = (page - 1) * limit;

    const repliesQuery = this.replyRepository
      .createQueryBuilder('reply')
      .leftJoinAndSelect('reply.author', 'author')
      .where('reply.postId = :postId', { postId })
      .andWhere('reply.parentReplyId IS NULL')
      .orderBy('reply.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    if (isModerator) {
      repliesQuery.andWhere('reply.status != :deletedStatus', {
        deletedStatus: ForumEntityStatus.DELETED,
      });
    } else {
      repliesQuery.andWhere(
        '(reply.status = :visibleStatus OR (reply.status = :hiddenStatus AND reply.authorId = :userId))',
        {
          visibleStatus: ForumEntityStatus.VISIBLE,
          hiddenStatus: ForumEntityStatus.HIDDEN,
          userId,
        },
      );
    }

    const [replies, total] = await repliesQuery.getManyAndCount();

    const repliesWithNested = await Promise.all(
      replies.map((reply) =>
        this.loadNestedReplies(reply, userId, isModerator),
      ),
    );

    return {
      data: repliesWithNested.map((reply) =>
        this.formatReplyResponse(reply, userId, isModerator),
      ),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async createReply(
    userId: string,
    dto: CreateForumReplyDto,
    userRoles: UserRoleEnum[] = [],
  ) {
    const post = await this.postRepository.findOne({
      where: { id: dto.postId },
      relations: ['course'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status === ForumEntityStatus.LOCKED) {
      throw new BadRequestException('Post is locked, cannot reply');
    }

    if (dto.parentReplyId) {
      const parentReply = await this.replyRepository.findOne({
        where: { id: dto.parentReplyId },
      });

      if (!parentReply) {
        throw new NotFoundException('Parent reply not found');
      }

      if (parentReply.status === ForumEntityStatus.DELETED) {
        throw new BadRequestException('Cannot reply to deleted reply');
      }
    }

    const reply = this.replyRepository.create({
      postId: dto.postId,
      authorId: userId,
      parentReplyId: dto.parentReplyId ?? null,
      body: dto.content,
      status: ForumEntityStatus.VISIBLE,
    });

    const saved = await this.replyRepository.save(reply);

    await this.postRepository.update(
      { id: dto.postId },
      { lastActivityAt: new Date() },
    );

    const reloaded = await this.replyRepository.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });

    const isModerator = await this.isCourseModerator(
      post.courseId,
      userId,
      userRoles,
    );

    const withNested = await this.loadNestedReplies(
      reloaded!,
      userId,
      isModerator,
    );

    return this.formatReplyResponse(withNested, userId, isModerator);
  }

  async updatePostStatus(
    postId: string,
    userId: string,
    userRoles: UserRoleEnum[],
    dto: UpdateForumPostStatusDto,
  ) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['course'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const isModerator = await this.isCourseModerator(
      post.courseId,
      userId,
      userRoles,
    );

    if (!isModerator) {
      throw new ForbiddenException(
        'Only admins or the course instructor can moderate posts',
      );
    }

    post.status = dto.status as ForumEntityStatus;
    await this.postRepository.save(post);

    const moderationAction = this.moderationRepository.create({
      actorUserId: userId,
      targetType: ModerationTargetType.POST,
      targetId: postId,
      action: this.statusToActionType(dto.status),
      reason: dto.reason ?? null,
    });
    await this.moderationRepository.save(moderationAction);

    return this.formatPostResponse(post);
  }

  async updateReplyStatus(
    replyId: string,
    userId: string,
    userRoles: UserRoleEnum[],
    dto: UpdateForumReplyStatusDto,
  ) {
    const reply = await this.replyRepository.findOne({
      where: { id: replyId },
      relations: ['author', 'post', 'post.course'],
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    const isModerator = await this.isCourseModerator(
      reply.post.courseId,
      userId,
      userRoles,
    );

    if (!isModerator) {
      throw new ForbiddenException(
        'Only admins or the course instructor can moderate replies',
      );
    }

    reply.status = dto.status as ForumEntityStatus;
    await this.replyRepository.save(reply);

    const moderationAction = this.moderationRepository.create({
      actorUserId: userId,
      targetType: ModerationTargetType.REPLY,
      targetId: replyId,
      action: this.statusToActionType(dto.status),
      reason: dto.reason ?? null,
    });
    await this.moderationRepository.save(moderationAction);

    const withNested = await this.loadNestedReplies(reply, userId, true);
    return this.formatReplyResponse(withNested, userId, true);
  }

  async deletePost(postId: string, userId: string, userRoles: UserRoleEnum[]) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const isInstructor = userRoles.includes(UserRoleEnum.INSTRUCTOR);
    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    const isAuthor = post.authorId === userId;

    if (!(isInstructor || isAdmin || isAuthor)) {
      throw new ForbiddenException('Cannot delete this post');
    }

    await this.postRepository.remove(post);

    if (isInstructor || isAdmin) {
      const moderationAction = this.moderationRepository.create({
        actorUserId: userId,
        targetType: ModerationTargetType.POST,
        targetId: postId,
        action: ModerationActionType.DELETE,
        reason: 'User/moderator deletion',
      });
      await this.moderationRepository.save(moderationAction);
    }
  }

  async deleteReply(
    replyId: string,
    userId: string,
    userRoles: UserRoleEnum[],
  ) {
    const reply = await this.replyRepository.findOne({
      where: { id: replyId },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    const isInstructor = userRoles.includes(UserRoleEnum.INSTRUCTOR);
    const isAdmin = userRoles.includes(UserRoleEnum.ADMIN);
    const isAuthor = reply.authorId === userId;

    if (!(isInstructor || isAdmin || isAuthor)) {
      throw new ForbiddenException('Cannot delete this reply');
    }

    await this.replyRepository.remove(reply);

    if (isInstructor || isAdmin) {
      const moderationAction = this.moderationRepository.create({
        actorUserId: userId,
        targetType: ModerationTargetType.REPLY,
        targetId: replyId,
        action: ModerationActionType.DELETE,
        reason: 'User/moderator deletion',
      });
      await this.moderationRepository.save(moderationAction);
    }
  }

  async getUserForums(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [posts, total] = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.course', 'course')
      .leftJoinAndSelect('post.replies', 'replies')
      .where('post.status != :deletedStatus', {
        deletedStatus: ForumEntityStatus.DELETED,
      })
      .andWhere(
        '(post.authorId = :userId OR EXISTS (SELECT 1 FROM forum_replies WHERE post_id = post.id AND author_id = :userId))',
        { userId },
      )
      .orderBy('post.lastActivityAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: posts.map((post) => ({
        ...this.formatPostResponse(post, userId, false),
        course: {
          id: post.course?.id,
          name: post.course?.title,
        },
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  private formatPostResponse(
    post: ForumPost,
    currentUserId?: string,
    isModerator: boolean = false,
  ) {
    const activeReplies =
      post.replies?.filter((reply) => {
        if (reply.status === ForumEntityStatus.DELETED) return false;
        if (isModerator) return true;
        if (reply.status === ForumEntityStatus.VISIBLE) return true;
        return (
          reply.status === ForumEntityStatus.HIDDEN &&
          reply.authorId === currentUserId
        );
      }) || [];

    return {
      id: post.id,
      courseId: post.courseId,
      title: post.title,
      body: post.body,
      status: post.status,
      isPinned: post.isPinned,
      author: {
        id: post.author?.id,
        displayName: post.author?.displayName,
        avatarS3Key: post.author?.avatarS3Key,
      },
      replyCount: activeReplies.length,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      lastActivityAt: post.lastActivityAt,
    };
  }

  private async loadNestedReplies(
    reply: ForumReply,
    userId: string,
    isModerator: boolean,
  ): Promise<ForumReply> {
    // load child replies recursively
    const childReplies = await this.replyRepository
      .createQueryBuilder('reply')
      .leftJoinAndSelect('reply.author', 'author')
      .where('reply.parentReplyId = :parentReplyId', {
        parentReplyId: reply.id,
      })
      .orderBy('reply.createdAt', 'ASC')
      .getMany();

    // filter based on visibility rules
    const filteredChildren = childReplies.filter((child) => {
      if (child.status === ForumEntityStatus.DELETED) return false;
      if (isModerator) return true;
      if (child.status === ForumEntityStatus.VISIBLE) return true;
      return (
        child.status === ForumEntityStatus.HIDDEN && child.authorId === userId
      );
    });

    // recursively load nested replies for each child
    reply.childReplies = await Promise.all(
      filteredChildren.map((child) =>
        this.loadNestedReplies(child, userId, isModerator),
      ),
    );

    return reply;
  }

  private formatReplyResponse(
    reply: ForumReply,
    currentUserId?: string,
    isModerator: boolean = false,
  ) {
    const filteredChildReplies =
      reply.childReplies?.filter((child) => {
        if (child.status === ForumEntityStatus.DELETED) return false;
        if (isModerator) return true;
        if (child.status === ForumEntityStatus.VISIBLE) return true;
        return (
          child.status === ForumEntityStatus.HIDDEN &&
          child.authorId === currentUserId
        );
      }) || [];

    return {
      id: reply.id,
      postId: reply.postId,
      parentReplyId: reply.parentReplyId,
      body: reply.body,
      status: reply.status,
      author: {
        id: reply.author?.id,
        displayName: reply.author?.displayName,
        avatarS3Key: reply.author?.avatarS3Key,
      },
      childReplies: filteredChildReplies.map((child) =>
        this.formatReplyResponse(child, currentUserId, isModerator),
      ),
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    };
  }

  private async isCourseModerator(
    courseId: string,
    userId: string,
    userRoles: UserRoleEnum[],
  ): Promise<boolean> {
    if (userRoles.includes(UserRoleEnum.ADMIN)) {
      return true;
    }

    if (!userRoles.includes(UserRoleEnum.INSTRUCTOR)) {
      return false;
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      select: ['id', 'createdBy'],
    });

    return Boolean(course && course.createdBy === userId);
  }

  private statusToActionType(status: string): ModerationActionType {
    switch (status) {
      case ForumEntityStatus.HIDDEN:
        return ModerationActionType.HIDE;
      case ForumEntityStatus.VISIBLE:
        return ModerationActionType.UNHIDE;
      case ForumEntityStatus.LOCKED:
        return ModerationActionType.LOCK;
      default:
        return ModerationActionType.UNHIDE;
    }
  }
}
