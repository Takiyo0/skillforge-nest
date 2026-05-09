import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../entities/progress/enrollment.entity';
import { CourseProgress } from '../entities/progress/course-progress.entity';
import { UnitProgress } from '../entities/progress/unit-progress.entity';
import { Course } from '../entities/course/course.entity';
import { Unit } from '../entities/course/unit.entity';
import { UnitPrerequisite } from '../entities/course/unit-prerequisite.entity';
import { XpEvent } from '../entities/xp-event.entity';
import { UserDailyStreak } from '../entities/user-daily-streak.entity';
import { User } from '../entities/user.entity';
import { PublicShowcase } from '../entities/public-showcase.entity';
import { Certificate } from '../entities/certificate.entity';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { StreaksService } from './streaks.service';
import { ShowcaseService } from './showcase.service';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      CourseProgress,
      UnitProgress,
      Course,
      Unit,
      UnitPrerequisite,
      XpEvent,
      User,
      UserDailyStreak,
      PublicShowcase,
      Certificate,
    ]),
    BadgesModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService, StreaksService, ShowcaseService],
  exports: [ProgressService, StreaksService, ShowcaseService],
})
export class ProgressModule {}
