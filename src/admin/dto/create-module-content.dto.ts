import {
    IsString,
    IsOptional,
    IsEnum,
    MaxLength,
    IsArray,
    IsNumber,
    ArrayMaxSize,
} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {ContentKind} from '../../entities/course/module-content.entity';

export class CreateModuleContentDto {
    @ApiProperty({
        description: 'Type of content',
        enum: ContentKind,
    })
    @IsEnum(ContentKind)
    contentKind: ContentKind;

    @ApiProperty({
        description: 'Video URL',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    videoUrl?: string;

    @ApiProperty({
        description: 'Article content in markdown format',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100000)
    articleMarkdown?: string;

    @ApiProperty({
        description: 'Subtitle text (maximum 500 characters)',
        maximum: 500,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    subtitle?: string;

    @ApiProperty({
        description: 'S3 key for subtitle file',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    subtitleS3Key?: string;

    @ApiProperty({
        description: 'Playback speeds available',
        type: [Number],
        required: false,
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(12)
    @IsNumber({}, {each: true})
    @Type(() => Number)
    playbackSpeeds?: number[];

    @ApiProperty({
        description: 'Whether picture-in-picture is supported',
        required: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    supportsPip?: boolean;
}

export class UpdateModuleContentDto {
    @ApiProperty({
        description: 'Type of content',
        enum: ContentKind,
        required: false,
    })
    @IsOptional()
    @IsEnum(ContentKind)
    contentKind?: ContentKind;

    @ApiProperty({
        description: 'Video URL',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    videoUrl?: string;

    @ApiProperty({
        description: 'Article content in markdown format',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100000)
    articleMarkdown?: string;

    @ApiProperty({
        description: 'Subtitle text (maximum 500 characters)',
        maximum: 500,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    subtitle?: string;

    @ApiProperty({
        description: 'S3 key for subtitle file',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    subtitleS3Key?: string;

    @ApiProperty({
        description: 'Playback speeds available',
        type: [Number],
        required: false,
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(12)
    @IsNumber({}, {each: true})
    @Type(() => Number)
    playbackSpeeds?: number[];

    @ApiProperty({
        description: 'Whether picture-in-picture is supported',
        required: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    supportsPip?: boolean;
}
