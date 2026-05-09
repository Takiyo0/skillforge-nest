import {
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateForumPostDto {
  @ApiProperty({
    description: 'Course ID (UUID)',
  })
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Post title (5-200 characters)',
    minimum: 5,
    maximum: 200,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Post content (1-10000 characters)',
    minimum: 1,
    maximum: 10000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}

export class CreateForumReplyDto {
  @ApiProperty({
    description: 'Post ID (UUID)',
  })
  @IsUUID()
  postId: string;

  @ApiProperty({
    description: 'Reply content (1-5000 characters)',
    minimum: 1,
    maximum: 5000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiProperty({
    description: 'Parent reply ID for nested replies',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  parentReplyId?: string;
}

export class UpdateForumPostStatusDto {
  @ApiProperty({
    description: 'Post status',
    enum: ['visible', 'hidden', 'locked', 'deleted'],
  })
  @IsString()
  status: 'visible' | 'hidden' | 'locked' | 'deleted';

  @ApiProperty({
    description: 'Reason for status change',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateForumReplyStatusDto {
  @ApiProperty({
    description: 'Reply status',
    enum: ['visible', 'hidden', 'locked', 'deleted'],
  })
  @IsString()
  status: 'visible' | 'hidden' | 'locked' | 'deleted';

  @ApiProperty({
    description: 'Reason for status change',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
