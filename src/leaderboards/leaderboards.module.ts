import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {LeaderboardsController} from './leaderboards.controller';
import {LeaderboardsService} from './leaderboards.service';
import {User} from '../entities/user.entity';
import {XpEvent} from '../entities/xp-event.entity';
import {UserDailyStreak} from '../entities/user-daily-streak.entity';

@Module({
    imports: [TypeOrmModule.forFeature([User, XpEvent, UserDailyStreak])],
    controllers: [LeaderboardsController],
    providers: [LeaderboardsService],
})
export class LeaderboardsModule {
}
