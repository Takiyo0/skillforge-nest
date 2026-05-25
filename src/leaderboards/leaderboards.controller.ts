import {Controller, Get, Query, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags} from '@nestjs/swagger';
import {LeaderboardsService} from './leaderboards.service';
import {GetGlobalLeaderboardDto, LeaderboardPeriod} from './dto/get-global-leaderboard.dto';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {CurrentUser} from '../users/decorators/current-user.decorator';
import {User} from '../entities/user.entity';

@ApiTags('Leaderboard')
@Controller('leaderboards')
export class LeaderboardsController {
    constructor(private leaderboardsService: LeaderboardsService) {
    }

    @Get('global/public')
    @ApiOperation({
        summary: 'Get public global leaderboard',
        description: 'Returns public top 5 global leaderboard entries',
    })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: LeaderboardPeriod,
        description: 'Leaderboard period: all_time or weekly',
    })
    @ApiResponse({
        status: 200,
        description: 'Public global leaderboard retrieved successfully',
    })
    async getPublicGlobalLeaderboard(@Query() query: GetGlobalLeaderboardDto) {
        return this.leaderboardsService.getPublicGlobalLeaderboard(
            query.period ?? LeaderboardPeriod.ALL_TIME,
        );
    }

    @Get('global')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get global leaderboard',
        description:
            'Returns cursor-based global leaderboard entries with myRank for authenticated user',
    })
    @ApiQuery({
        name: 'period',
        required: false,
        enum: LeaderboardPeriod,
        description: 'Leaderboard period: all_time or weekly',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Items per request (max 100)',
    })
    @ApiQuery({
        name: 'lastId',
        required: false,
        type: String,
        description: 'Last seen userId from previous response; fetches rows after that rank',
    })
    @ApiResponse({
        status: 200,
        description: 'Global leaderboard retrieved successfully',
    })
    async getGlobalLeaderboard(
        @CurrentUser() user: User,
        @Query() query: GetGlobalLeaderboardDto,
    ) {
        return this.leaderboardsService.getGlobalLeaderboard(
            user.id,
            query.period ?? LeaderboardPeriod.ALL_TIME,
            query.limit ?? 20,
            query.lastId,
        );
    }
}
