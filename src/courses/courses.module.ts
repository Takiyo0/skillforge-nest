import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course/course.entity';
import { Unit } from '../entities/course/unit.entity';
import { UnitPrerequisite } from '../entities/course/unit-prerequisite.entity';
import { ModuleContent } from '../entities/course/module-content.entity';
import { ModuleResource } from '../entities/course/module-resource.entity';
import { Enrollment } from '../entities/progress/enrollment.entity';
import { CourseProgress } from '../entities/progress/course-progress.entity';
import { UnitProgress } from '../entities/progress/unit-progress.entity';
import { Exercise } from '../entities/exercise.entity';
import { ExerciseTestCase } from '../entities/exercise-test-case.entity';
import { ExerciseHint } from '../entities/exercise-hint.entity';
import { Quiz } from '../entities/quiz.entity';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { QuizOption } from '../entities/quiz-option.entity';
import {
  CodeSubmission,
  FinalExamAttempt,
  FinalExam,
  FinalExamComponent,
} from '../entities';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { QuizAttemptAnswer } from '../entities/quiz-attempt-answer.entity';
import { XpEvent } from '../entities/xp-event.entity';
import { CoursesController } from './courses.controller';
import { UnitsController } from './units.controller';
import { CoursesService } from './courses.service';
import { CertificateModule } from '../certificates/certificate.module';
import { BadgesModule } from '../badges/badges.module';
import { S3Module } from '../common/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Unit,
      UnitPrerequisite,
      ModuleContent,
      ModuleResource,
      Enrollment,
      CourseProgress,
      UnitProgress,
      Exercise,
      ExerciseTestCase,
      ExerciseHint,
      Quiz,
      QuizQuestion,
      QuizOption,
      CodeSubmission,
      QuizAttempt,
      QuizAttemptAnswer,
      FinalExamAttempt,
      FinalExam,
      FinalExamComponent,
      XpEvent,
    ]),
    CertificateModule,
    BadgesModule,
    S3Module,
  ],
  controllers: [CoursesController, UnitsController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
