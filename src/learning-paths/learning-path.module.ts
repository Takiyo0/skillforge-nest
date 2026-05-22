import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningPathService } from './learning-path.service';
import { LearningPathController } from './learning-path.controller';
import { LearningPath, LearningPathCourse } from '../entities';
import { UserPreference } from '../entities/user-preference.entity';
import { Course } from '../entities/course/course.entity';
import { OnboardingQuizResponse } from '../entities/onboarding/onboarding-quiz-response.entity';
import {Enrollment} from '../entities/progress/enrollment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LearningPath,
      LearningPathCourse,
      UserPreference,
      Course,
      OnboardingQuizResponse,
        Enrollment,
    ]),
  ],
  providers: [LearningPathService],
  controllers: [LearningPathController],
  exports: [LearningPathService],
})
export class LearningPathModule {}
