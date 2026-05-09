import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { UserDailyStreak } from '../entities/user-daily-streak.entity';
import { XpEvent } from '../entities/xp-event.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Certificate } from '../entities/certificate.entity';
import { Enrollment } from '../entities/progress/enrollment.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { S3Module } from '../common/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserPreference,
      UserDailyStreak,
      XpEvent,
      UserBadge,
      Certificate,
      Enrollment,
    ]),
    S3Module,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
