import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course/course.entity';
import { Unit } from '../entities/course/unit.entity';
import { UnitPrerequisite } from '../entities/course/unit-prerequisite.entity';
import { Exercise } from '../entities/exercise.entity';
import { ExerciseTestCase } from '../entities/exercise-test-case.entity';
import { ExerciseHint } from '../entities/exercise-hint.entity';
import { Quiz } from '../entities/quiz.entity';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { QuizOption } from '../entities/quiz-option.entity';
import { ModuleContent } from '../entities/course/module-content.entity';
import { ModuleResource } from '../entities/course/module-resource.entity';
import {
  FinalExam,
    FinalExamAttempt,
  FinalExamComponent,
  LearningPath,
  LearningPathCourse,
} from '../entities';
import { Badge } from '../entities/badge.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { AdminCoursesService } from './services/admin-courses.service';
import { AdminUnitsService } from './services/admin-units.service';
import { AdminExercisesService } from './services/admin-exercises.service';
import { AdminQuizzesService } from './services/admin-quizzes.service';
import { AdminModuleContentService } from './services/admin-module-content.service';
import { AdminFinalExamService } from './services/admin-final-exam.service';
import { AdminBadgesService } from './services/admin-badges.service';
import { AdminUsersService } from './services/admin-users.service';
import { LearningPathAdminService } from './learning-path-admin.service';
import { AdminController } from './controllers/admin.controller';
import { LearningPathAdminController } from './learning-path-admin.controller';
import { AdminModuleResourcesService } from './services/admin-module-resources.service';
import { AdminMediaUploadService } from './services/admin-media-upload.service';
import { BadgesModule } from '../badges/badges.module';
import { S3Module } from '../common/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Unit,
      UnitPrerequisite,
      Exercise,
      ExerciseTestCase,
      ExerciseHint,
      Quiz,
      QuizQuestion,
      QuizOption,
      ModuleContent,
      ModuleResource,
      FinalExam,
        FinalExamAttempt,
      FinalExamComponent,
      LearningPath,
      LearningPathCourse,
      User,
      UserRole,
      Badge,
    ]),
    BadgesModule,
    S3Module,
  ],
  controllers: [AdminController, LearningPathAdminController],
  providers: [
    AdminCoursesService,
    AdminUnitsService,
    AdminExercisesService,
    AdminQuizzesService,
    AdminModuleContentService,
    AdminFinalExamService,
    AdminBadgesService,
    AdminUsersService,
    LearningPathAdminService,
    AdminModuleResourcesService,
    AdminMediaUploadService,
  ],
})
export class AdminModule {}
