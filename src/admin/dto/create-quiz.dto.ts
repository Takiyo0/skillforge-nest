import {
    IsString,
    IsOptional,
    IsInt,
    Min,
    Max,
    IsBoolean,
    IsArray,
    ValidateNested,
    IsEnum,
    MinLength,
    MaxLength,
    ArrayMaxSize,
} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {QuizQuestionType} from '../../entities/quiz-question.entity';

export class CreateQuizDto {
    @ApiProperty({
        description: 'Quiz title (3-200 characters)',
        minimum: 3,
        maximum: 200,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @ApiProperty({
        description: 'Quiz instructions',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    instructions?: string;

    @ApiProperty({
        description: 'Passing score percentage (0-100)',
        default: 70,
        minimum: 0,
        maximum: 100,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    passingScore?: number = 70;

    @ApiProperty({
        description: 'Time limit in seconds (minimum 60)',
        minimum: 60,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(60)
    @Type(() => Number)
    timeLimitSeconds?: number;

    @ApiProperty({
        description: 'Randomize question order',
        default: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    randomizeQuestions?: boolean = false;

    @ApiProperty({
        description: 'Randomize option order',
        default: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    randomizeOptions?: boolean = false;
}

export class UpdateQuizDto {
    @ApiProperty({
        description: 'Quiz title (3-200 characters)',
        minimum: 3,
        maximum: 200,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    title?: string;

    @ApiProperty({
        description: 'Quiz instructions',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    instructions?: string;

    @ApiProperty({
        description: 'Passing score percentage (0-100)',
        minimum: 0,
        maximum: 100,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    passingScore?: number;

    @ApiProperty({
        description: 'Time limit in seconds (minimum 60)',
        minimum: 60,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(60)
    @Type(() => Number)
    timeLimitSeconds?: number;

    @ApiProperty({
        description: 'Randomize question order',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    randomizeQuestions?: boolean;

    @ApiProperty({
        description: 'Randomize option order',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    randomizeOptions?: boolean;
}

export class CreateQuizOptionDto {
    @ApiProperty({
        description: 'Option label (1-500 characters)',
        minimum: 1,
        maximum: 500,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    label: string;

    @ApiProperty({
        description: 'Whether this is the correct answer',
    })
    @IsBoolean()
    isCorrect: boolean;

    @ApiProperty({
        description: 'Position of option (minimum 1)',
        minimum: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    position?: number;
}

export class CreateQuizQuestionDto {
    @ApiProperty({
        description: 'Question prompt (5-2000 characters)',
        minimum: 5,
        maximum: 2000,
    })
    @IsString()
    @MinLength(5)
    @MaxLength(2000)
    prompt: string;

    @ApiProperty({
        description: 'Points for this question (1-100)',
        default: 1,
        minimum: 1,
        maximum: 100,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    points?: number = 1;

    @ApiProperty({
        description: 'Explanation for the answer',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    explanation?: string;

    @ApiProperty({
        description: 'Quiz options',
        type: [CreateQuizOptionDto],
    })
    @IsArray()
    @ArrayMaxSize(10)
    @ValidateNested({each: true})
    @Type(() => CreateQuizOptionDto)
    options: CreateQuizOptionDto[];
}

export class UpdateQuizQuestionDto {
    @ApiProperty({
        description: 'Question prompt (5-2000 characters)',
        minimum: 5,
        maximum: 2000,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(5)
    @MaxLength(2000)
    prompt?: string;

    @ApiProperty({
        description: 'Points for this question (1-100)',
        minimum: 1,
        maximum: 100,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    points?: number;

    @ApiProperty({
        description: 'Explanation for the answer',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    explanation?: string;
}

export class UpdateQuizOptionDto {
    @ApiProperty({
        description: 'Option label (1-500 characters)',
        minimum: 1,
        maximum: 500,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    label?: string;

    @ApiProperty({
        description: 'Whether this is the correct answer',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isCorrect?: boolean;

    @ApiProperty({
        description: 'Position of option (minimum 1)',
        minimum: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    position?: number;
}
