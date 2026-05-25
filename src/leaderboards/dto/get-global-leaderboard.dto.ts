import {Transform} from 'class-transformer';
import {IsEnum, IsInt, IsOptional, IsString, Max, Min} from 'class-validator';

export enum LeaderboardPeriod {
    ALL_TIME = 'all_time',
    WEEKLY = 'weekly',
}

export class GetGlobalLeaderboardDto {
    @IsOptional()
    @IsEnum(LeaderboardPeriod)
    period?: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME;

    @IsOptional()
    @Transform(({value}) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @IsOptional()
    @IsString()
    lastId?: string;
}
