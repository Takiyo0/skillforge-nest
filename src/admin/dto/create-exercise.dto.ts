import {
    IsString,
    IsOptional,
    IsEnum,
    MinLength,
    MaxLength,
    IsInt,
    Min, IsBoolean,
    IsIn,
} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {ChallengeDifficulty} from '../../entities/exercise.entity';
import {SUPPORTED_CODE_LANGUAGES} from '../../common/constants/supported-languages';

export class CreateExerciseDto {
    @ApiProperty({
        description: 'Exercise title (3-220 characters)',
        minimum: 3,
        maximum: 220,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(220)
    title: string;

    @ApiProperty({
        description: 'Exercise prompt in markdown format',
    })
    @IsString()
    @MaxLength(20000)
    promptMarkdown: string;

    @ApiProperty({
        description: 'Exercise difficulty level',
        enum: ChallengeDifficulty,
    })
    @IsEnum(ChallengeDifficulty)
    difficulty: ChallengeDifficulty;

    @ApiProperty({
        description: 'Programming language (maximum 40 characters)',
        maximum: 40,
        enum: SUPPORTED_CODE_LANGUAGES,
    })
    @IsString()
    @MaxLength(40)
    @IsIn(SUPPORTED_CODE_LANGUAGES)
    language: string;

    @ApiProperty({
        description: 'Starter code template',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50000)
    starterCode?: string;

    @ApiProperty({
        description: 'Maximum CPU time in milliseconds (minimum 100)',
        minimum: 100,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(100)
    @Type(() => Number)
    maxCpuMs?: number;

    @ApiProperty({
        description: 'Maximum memory in kilobytes (minimum 1024)',
        minimum: 1024,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1024)
    @Type(() => Number)
    maxMemoryKb?: number;
}

export class UpdateExerciseDto {
    @ApiProperty({
        description: 'Exercise title (3-220 characters)',
        minimum: 3,
        maximum: 220,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(220)
    title?: string;

    @ApiProperty({
        description: 'Exercise prompt in markdown format',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20000)
    promptMarkdown?: string;

    @ApiProperty({
        description: 'Exercise difficulty level',
        enum: ChallengeDifficulty,
        required: false,
    })
    @IsOptional()
    @IsEnum(ChallengeDifficulty)
    difficulty?: ChallengeDifficulty;

    @ApiProperty({
        description: 'Programming language',
        maximum: 40,
        enum: SUPPORTED_CODE_LANGUAGES,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(40)
    @IsIn(SUPPORTED_CODE_LANGUAGES)
    language?: string;

    @ApiProperty({
        description: 'Starter code template',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50000)
    starterCode?: string;

    @ApiProperty({
        description: 'Maximum CPU time in milliseconds (minimum 100)',
        minimum: 100,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(100)
    @Type(() => Number)
    maxCpuMs?: number;

    @ApiProperty({
        description: 'Maximum memory in kilobytes (minimum 1024)',
        minimum: 1024,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1024)
    @Type(() => Number)
    maxMemoryKb?: number;
}

export class CreateTestCaseDto {
    @ApiProperty({
        description: 'Test input text',
    })
    @IsString()
    @MaxLength(10000)
    inputText: string;

    @ApiProperty({
        description: 'Expected output text',
    })
    @IsString()
    @MaxLength(10000)
    expectedOutput: string;

    @ApiProperty({
        description: 'Test case description',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiProperty({
        description: 'Whether test case should be hidden to user or not',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isHidden?: boolean;
}

export class UpdateTestCaseDto {
    @ApiProperty({
        description: 'Test input text',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    inputText?: string;

    @ApiProperty({
        description: 'Expected output text',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    expectedOutput?: string;

    @ApiProperty({
        description: 'Test case description',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiProperty({
        description: 'Whether test case should be hidden to user or not',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isHidden?: boolean;
}

export class CreateHintDto {
    @ApiProperty({
        description: 'Hint content (10-1000 characters)',
        minimum: 10,
        maximum: 1000,
    })
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    content: string;

    @ApiProperty({
        description: 'Failed attempts required to unlock hint (minimum 1)',
        default: 3,
        minimum: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    requiredFailedAttempts?: number = 3;
}

export class UpdateHintDto {
    @ApiProperty({
        description: 'Hint content (10-1000 characters)',
        minimum: 10,
        maximum: 1000,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    content?: string;

    @ApiProperty({
        description: 'Failed attempts required to unlock hint (minimum 1)',
        minimum: 1,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    requiredFailedAttempts?: number;
}
