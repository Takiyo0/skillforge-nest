import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreference } from '../entities/user-preference.entity';
import { OnboardingQuizQuestion } from '../entities/onboarding/onboarding-quiz-question.entity';
import { OnboardingQuizResponse } from '../entities/onboarding/onboarding-quiz-response.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { LearningPathModule } from '../learning-paths/learning-path.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPreference,
      OnboardingQuizQuestion,
      OnboardingQuizResponse,
    ]),
    forwardRef(() => LearningPathModule),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
