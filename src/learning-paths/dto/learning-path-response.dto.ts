import {ApiProperty} from '@nestjs/swagger';

export class LearningPathCourseSummaryDto {
    @ApiProperty({
        description: 'Course ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    id: string;

    @ApiProperty({
        description: 'Course title',
        example: 'HTML Basics',
    })
    title: string;

    @ApiProperty({
        description: 'Whether this course is completed by the current user',
        example: false,
    })
    completed: boolean;

    @ApiProperty({
        description: 'Course description',
        nullable: true,
        example: 'Learn the foundations of semantic HTML.',
    })
    description: string | null;

    @ApiProperty({
        description: 'Programming language code',
        example: 'javascript',
    })
    language: string;

    @ApiProperty({
        description: 'Difficulty level',
        example: 'beginner',
    })
    level: string;

    @ApiProperty({
        description: 'Course thumbnail key in S3',
        nullable: true,
        example: 'courses/abc/thumbnails/thumb.jpg',
    })
    thumbnailS3Key: string | null;

    @ApiProperty({
        description: 'Current user progress for this course in percentage',
        example: 42.5,
    })
    progressPercent: number;

    @ApiProperty({
        description: 'Course slug',
        example: 'html-basics',
    })
    courseSlug: string;

    @ApiProperty({
        description: 'Course position inside the learning path',
        example: 1,
    })
    position: number;
}

export class LearningPathItemDto {
    @ApiProperty({
        description: 'Learning path ID',
        example: 'f1d8f8a2-c46d-46a2-a5ea-6f5b8df6fa21',
    })
    id: string;

    @ApiProperty({
        description: 'Learning path slug',
        example: 'backend-go-developer',
    })
    slug: string;

    @ApiProperty({
        description: 'Learning path title',
        example: 'Backend Go Developer',
    })
    title: string;

    @ApiProperty({
        description: 'Learning path description',
        nullable: true,
        example: 'Structured path to become a Go backend engineer.',
    })
    description: string | null;

    @ApiProperty({
        description: 'Matching criteria used by onboarding auto-assignment',
        type: 'object',
        additionalProperties: true,
        example: {wantToLearn: ['Backend'], languages: ['go']},
    })
    criteria: Record<string, any>;

    @ApiProperty({
        description: 'Courses in this path ordered by position',
        type: [LearningPathCourseSummaryDto],
    })
    courses: LearningPathCourseSummaryDto[];

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2026-05-23T07:41:09.482Z',
    })
    createdAt: Date;
}

export class LearningPathListResponseDto {
    @ApiProperty({
        description: 'List of available learning paths',
        type: [LearningPathItemDto],
    })
    data: LearningPathItemDto[];
}

export class UserLearningPathResponseDto extends LearningPathItemDto {
}

export class NoLearningPathResponseDto {
    @ApiProperty({
        description: 'Response message when user has no assigned learning path',
        example: 'No learning path assigned',
    })
    message: string;
}

export class JoinLearningPathResponseDto {
    @ApiProperty({
        description: 'Operation result message',
        example: 'Joined learning path successfully',
    })
    message: string;

    @ApiProperty({
        description: 'Learning path that the user joined',
        example: 'f1d8f8a2-c46d-46a2-a5ea-6f5b8df6fa21',
    })
    learningPathId: string;
}

export class LeaveLearningPathResponseDto {
    @ApiProperty({
        description: 'Operation result message',
        example: 'Left learning path successfully',
    })
    message: string;
}
