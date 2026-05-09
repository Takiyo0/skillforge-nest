import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Course, CourseLevel } from '../entities/course/course.entity';
import { Unit, UnitType } from '../entities/course/unit.entity';
import { UnitPrerequisite } from '../entities/course/unit-prerequisite.entity';
import { ModuleContent } from '../entities/course/module-content.entity';
import { ModuleResource } from '../entities/course/module-resource.entity';
import { Enrollment } from '../entities/progress/enrollment.entity';
import { CourseProgress } from '../entities/progress/course-progress.entity';
import {
  UnitProgress,
  UnitProgressStatus,
} from '../entities/progress/unit-progress.entity';
import { Exercise } from '../entities/exercise.entity';
import { ExerciseTestCase } from '../entities/exercise-test-case.entity';
import { ExerciseHint } from '../entities/exercise-hint.entity';
import { Quiz } from '../entities/quiz.entity';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { QuizOption } from '../entities/quiz-option.entity';
import {
  CodeSubmission,
  SubmissionStatus,
  SubmissionKind,
  FinalExamAttempt,
  FinalExam,
  FinalExamComponent,
} from '../entities';
import { FinalExamComponentType } from '../entities/final-exam-component.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { XpEvent } from '../entities/xp-event.entity';
import { ListCoursesDto } from './dto/list-courses.dto';
import { FinalExamSubmissionDto } from './dto/final-exam-submission.dto';
import { CertificateService } from '../certificates/certificate.service';
import { BadgesService } from '../badges/badges.service';
import { S3Service } from '../common/s3.service';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitPrerequisite)
    private unitPrerequisiteRepository: Repository<UnitPrerequisite>,
    @InjectRepository(ModuleContent)
    private moduleContentRepository: Repository<ModuleContent>,
    @InjectRepository(ModuleResource)
    private moduleResourceRepository: Repository<ModuleResource>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseProgress)
    private courseProgressRepository: Repository<CourseProgress>,
    @InjectRepository(Exercise)
    private exerciseRepository: Repository<Exercise>,
    @InjectRepository(ExerciseTestCase)
    private exerciseTestCaseRepository: Repository<ExerciseTestCase>,
    @InjectRepository(ExerciseHint)
    private exerciseHintRepository: Repository<ExerciseHint>,
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizOption)
    private quizOptionRepository: Repository<QuizOption>,
    @InjectRepository(CodeSubmission)
    private codeSubmissionRepository: Repository<CodeSubmission>,
    @InjectRepository(QuizAttempt)
    private quizAttemptRepository: Repository<QuizAttempt>,
    @InjectRepository(FinalExamAttempt)
    private finalExamAttemptRepository: Repository<FinalExamAttempt>,
    @InjectRepository(FinalExam)
    private finalExamRepository: Repository<FinalExam>,
    @InjectRepository(FinalExamComponent)
    private finalExamComponentRepository: Repository<FinalExamComponent>,
    @InjectRepository(UnitProgress)
    private unitProgressRepository: Repository<UnitProgress>,
    @InjectRepository(XpEvent)
    private xpEventRepository: Repository<XpEvent>,
    private certificateService: CertificateService,
    private badgesService: BadgesService,
    private s3Service: S3Service,
  ) {}

  async listCourses(dto: ListCoursesDto, userId?: string) {
    const search = dto.search;
    const level = dto.level;
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.creator', 'creator')
      .where('course.isPublished = :isPublished', { isPublished: true })
      .orderBy('course.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (level) {
      queryBuilder.andWhere('course.level = :level', { level });
    }

    const [courses, total] = await queryBuilder.getManyAndCount();

    const enrollmentMap: Map<string, boolean> = new Map();
    if (userId) {
      const courseIds = courses.map((c) => c.id);
      const enrollments = await this.enrollmentRepository.find({
        where: { userId, courseId: In(courseIds) },
      });
      enrollments.forEach((e) => enrollmentMap.set(e.courseId, true));
    }

    return {
      data: courses.map((course) => ({
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailS3Key: course.thumbnailS3Key,
        level: course.level,
        language: course.language,
        priceCents: course.priceCents,
        creator: course.creator
          ? {
              id: course.creator.id,
              displayName: course.creator.displayName,
            }
          : null,
        enrolled: userId ? enrollmentMap.has(course.id) : false,
        createdAt: course.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listEnrolledCourses(userId: string, dto: ListCoursesDto) {
    const search = dto.search;
    const level = dto.level;
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const enrollmentQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.creator', 'creator')
      .leftJoinAndSelect('enrollment.courseProgress', 'progress')
      .where('enrollment.userId = :userId', { userId })
      .andWhere('course.isPublished = :isPublished', { isPublished: true })
      .orderBy('enrollment.enrolledAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      enrollmentQuery.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (level) {
      enrollmentQuery.andWhere('course.level = :level', { level });
    }

    const [enrollments, total] = await enrollmentQuery.getManyAndCount();

    return {
      data: enrollments.map((enrollment) => ({
        id: enrollment.course.id,
        slug: enrollment.course.slug,
        title: enrollment.course.title,
        subtitle: enrollment.course.subtitle,
        description: enrollment.course.description,
        thumbnailS3Key: enrollment.course.thumbnailS3Key,
        level: enrollment.course.level,
        language: enrollment.course.language,
        priceCents: enrollment.course.priceCents,
        creator: enrollment.course.creator
          ? {
              id: enrollment.course.creator.id,
              displayName: enrollment.course.creator.displayName,
            }
          : null,
        enrolled: true,
        enrollmentStatus: enrollment.status,
        progressPercent: enrollment.courseProgress?.progressPercent ?? 0,
        enrolledAt: enrollment.enrolledAt,
        createdAt: enrollment.course.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCourseDetail(courseId: string) {
    try {
      const course = await this.courseRepository.findOne({
        where: { id: courseId, isPublished: true },
        relations: ['creator'],
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      const unitCount = await this.unitRepository.count({
        where: { courseId, isPublished: true },
      });

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailS3Key: course.thumbnailS3Key,
        trailerUrl: course.trailerUrl,
        level: course.level,
        language: course.language,
        priceCents: course.priceCents,
        currencyCode: course.currencyCode,
        unitCount,
        creator: course.creator
          ? {
              id: course.creator.id,
              displayName: course.creator.displayName,
              bio: course.creator.bio,
            }
          : null,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('invalid input syntax for type uuid')
      ) {
        throw new NotFoundException('Invalid course ID');
      }
      throw new InternalServerErrorException(
        'Failed to retrieve course details',
      );
    }
  }

  async getCourseUnits(courseId: string) {
    try {
      const course = await this.courseRepository.findOne({
        where: { id: courseId, isPublished: true },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      const units = await this.unitRepository.find({
        where: { courseId, isPublished: true },
        order: { position: 'ASC' },
      });

      return {
        courseId,
        units: units.map((unit) => ({
          id: unit.id,
          title: unit.title,
          summary: unit.summary,
          type: unit.type,
          estimatedMinutes: unit.estimatedMinutes,
          position: unit.position,
        })),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('invalid input syntax for type uuid')
      ) {
        throw new NotFoundException('Invalid course ID');
      }
      throw new InternalServerErrorException(
        'Failed to retrieve course details',
      );
    }
  }

  async getUnitDetail(unitId: string, userId?: string) {
    try {
      const unit = await this.unitRepository.findOne({
        where: { id: unitId, isPublished: true },
        relations: ['course'],
      });

      if (!unit) {
        throw new NotFoundException('Unit not found');
      }

      const prerequisites = await this.unitPrerequisiteRepository.find({
        where: { unitId },
        relations: ['prerequisiteUnit'],
      });

      const requiredFor = await this.unitPrerequisiteRepository.find({
        where: { prerequisiteUnitId: unitId },
        relations: ['unit'],
      });

      let moduleContent: {
        contentKind: string;
        videoUrl: string | null;
        articleMarkdown: string | null;
        subtitleS3Key: string | null;
        playbackSpeeds: number[];
        supportsPip: boolean;
      } | null = null;
      let moduleResources: Array<{
        id: string;
        unitId: string;
        label: string;
        resourceType: string;
        s3Key: string;
        url: string;
        createdAt: Date;
      }> = [];

      if (unit.type === UnitType.MODULE) {
        const [content, resources] = await Promise.all([
          this.moduleContentRepository.findOne({
            where: { unitId },
          }),
          this.moduleResourceRepository.find({
            where: { unitId },
            order: { createdAt: 'DESC' },
          }),
        ]);

        if (content) {
          moduleContent = {
            contentKind: content.contentKind,
            videoUrl: content.videoUrl,
            articleMarkdown: content.articleMarkdown,
            subtitleS3Key: content.subtitleS3Key,
            playbackSpeeds: content.playbackSpeeds,
            supportsPip: content.supportsPip,
          };
        }
        moduleResources = resources.map((resource) => ({
          id: resource.id,
          unitId: resource.unitId,
          label: resource.label,
          resourceType: resource.resourceType,
          s3Key: resource.s3Key,
          url: this.s3Service.getPublicUrl(resource.s3Key),
          createdAt: resource.createdAt,
        }));
      }

      const exercise = await this.exerciseRepository.findOne({
        where: { unitId: unit.id },
      });

      let exerciseDetail: {
        id: string;
        difficulty: string;
        title: string;
        promptMarkdown: string;
        language: string;
        starterCode: string | null;
        maxCpuMs: number | null;
        maxMemoryKb: number | null;
        createdAt: Date;
        testCases: Array<{
          id: string;
          inputText: string | null;
          expectedOutput: string;
          isHidden: boolean;
          weight: number;
        }>;
        hints: Array<{
          id: string;
          hintText: string;
          unlockAfterFailedAttempts: number;
          position: number;
        }>;
      } | null = null;

      if (exercise) {
        const [testCases, hints] = await Promise.all([
          this.exerciseTestCaseRepository.find({
            where: { exerciseId: exercise.id },
            order: { id: 'ASC' },
          }),
          this.exerciseHintRepository.find({
            where: { exerciseId: exercise.id },
            order: { position: 'ASC' },
          }),
        ]);

        exerciseDetail = {
          id: exercise.id,
          difficulty: exercise.difficulty,
          title: exercise.title,
          promptMarkdown: exercise.promptMarkdown,
          language: exercise.language,
          starterCode: exercise.starterCode,
          maxCpuMs: exercise.maxCpuMs,
          maxMemoryKb: exercise.maxMemoryKb,
          createdAt: exercise.createdAt,
          testCases: testCases.map((testCase) => ({
            id: testCase.id,
            inputText: testCase.inputText,
            expectedOutput: testCase.expectedOutput,
            isHidden: testCase.isHidden,
            weight: Number(testCase.weight),
          })),
          hints: hints.map((hint) => ({
            id: hint.id,
            hintText: hint.hintText,
            unlockAfterFailedAttempts: hint.unlockAfterFailedAttempts,
            position: hint.position,
          })),
        };
      }

      let quizDetail: any = null;
      let submissions: any[] = [];

      if (unit.type !== UnitType.FINAL_EXAM) {
        const quiz = await this.quizRepository.findOne({
          where: { unitId: unit.id },
        });

        if (quiz) {
          const questions = await this.quizQuestionRepository.find({
            where: { quizId: quiz.id },
            order: { position: 'ASC' },
          });

          const questionIds = questions.map((question) => question.id);
          const options =
            questionIds.length > 0
              ? await this.quizOptionRepository.find({
                  where: { questionId: In(questionIds) },
                  order: { position: 'ASC' },
                })
              : [];

          const optionsByQuestionId = new Map<string, QuizOption[]>();
          options.forEach((option) => {
            const list = optionsByQuestionId.get(option.questionId) || [];
            list.push(option);
            optionsByQuestionId.set(option.questionId, list);
          });

          quizDetail = {
            id: quiz.id,
            title: quiz.title,
            instructions: quiz.instructions,
            passingScore: Number(quiz.passingScore),
            timeLimitSeconds: quiz.timeLimitSeconds,
            randomizeQuestions: quiz.randomizeQuestions,
            randomizeOptions: quiz.randomizeOptions,
            createdAt: quiz.createdAt,
            questions: questions.map((question) => {
              const questionOptions =
                optionsByQuestionId.get(question.id) || [];
              const correctOptionsCount = questionOptions.filter(
                (o) => o.isCorrect,
              ).length;
              return {
                id: question.id,
                questionType: question.questionType,
                prompt: question.prompt,
                explanation: question.explanation,
                points: Number(question.points),
                position: question.position,
                answerMultiple: correctOptionsCount > 1,
                options: questionOptions.map((option) => ({
                  id: option.id,
                  label: option.label,
                })),
              };
            }),
          };
        }

        if (userId && unit.type === UnitType.EXERCISE && exerciseDetail) {
          const userSubmissions = await this.codeSubmissionRepository.find({
            where: {
              exerciseId: exerciseDetail.id,
              userId,
              status: SubmissionStatus.PASSED,
            },
            relations: ['testResults'],
            order: { queuedAt: 'DESC' },
          });

          submissions = userSubmissions.map((submission) => {
            const testsPassed =
              submission.testResults?.filter((r) => r.passed).length ?? 0;
            const testsFailed =
              submission.testResults?.filter((r) => !r.passed).length ?? 0;

            return {
              id: submission.id,
              userId: submission.userId,
              language: submission.language,
              sourceCode: submission.sourceCode,
              status: submission.status,
              aiScore: submission.aiScore,
              aiSummary: submission.aiSummary,
              testsPassed,
              testsFailed,
              stdout: submission.stdout,
              stderr: submission.stderr,
              queuedAt: submission.queuedAt,
              finishedAt: submission.finishedAt,
            };
          });
        }

        let quizSubmissions: any[] = [];
        if (userId && unit.type === 'assessment' && quizDetail) {
          const userQuizSubmissions = await this.quizAttemptRepository.find({
            where: {
              quizId: quizDetail.id,
              userId,
            },
            order: { submittedAt: 'DESC' },
          });

          quizSubmissions = userQuizSubmissions.map((attempt) => ({
            id: attempt.id,
            attemptNumber: attempt.attemptNumber,
            scorePercent: attempt.scorePercent,
            isPassed: attempt.isPassed,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
          }));
        }

        if (quizDetail && quizSubmissions.length > 0) {
          quizDetail.submissions = quizSubmissions;
        }
      }

      let finalExamDetail: any = null;
      if ((unit as any).type === UnitType.FINAL_EXAM) {
        const finalExam = await this.finalExamRepository.findOne({
          where: { unitId: unit.id },
        });

        if (finalExam) {
          const components = await this.finalExamComponentRepository.find({
            where: { finalExamUnitId: unit.id },
            order: { position: 'ASC' },
          });

          const questions: any[] = [];
          for (const component of components) {
            if (component.quizId) {
              const quiz = await this.quizRepository.findOne({
                where: { id: component.quizId },
              });

              if (quiz) {
                const quizQuestions = await this.quizQuestionRepository.find({
                  where: { quizId: quiz.id },
                  order: { position: 'ASC' },
                });

                const questionIds = quizQuestions.map((q) => q.id);
                const quizOptions =
                  questionIds.length > 0
                    ? await this.quizOptionRepository.find({
                        where: { questionId: In(questionIds) },
                        order: { position: 'ASC' },
                      })
                    : [];

                const optionsByQuestionId = new Map<string, QuizOption[]>();
                quizOptions.forEach((option) => {
                  const list = optionsByQuestionId.get(option.questionId) || [];
                  list.push(option);
                  optionsByQuestionId.set(option.questionId, list);
                });

                quizQuestions.forEach((q) => {
                  const questionOptions = optionsByQuestionId.get(q.id) || [];
                  const correctOptionsCount = questionOptions.filter(
                    (o) => o.isCorrect,
                  ).length;
                  questions.push({
                    id: q.id,
                    type: 'quiz',
                    questionType: q.questionType,
                    prompt: q.prompt,
                    points: Number(q.points),
                    position: q.position,
                    answerMultiple: correctOptionsCount > 1,
                    options: questionOptions.map((option) => ({
                      id: option.id,
                      label: option.label,
                    })),
                  });
                });
              }
            }
          }

          finalExamDetail = {
            unitId: finalExam.unitId,
            title: finalExam.title,
            passingScore: Number(finalExam.passingScore),
            maxAttempts: finalExam.maxAttempts,
            timeLimitSeconds: finalExam.timeLimitSeconds,
            createdAt: finalExam.createdAt,
          };
        }
      }

      let finalExamSubmissions: any[] = [];
      let finalExamAttemptProgress: any = null;
      if (userId && (unit as any).type === UnitType.FINAL_EXAM) {
        const userFinalExamSubmissions =
          await this.finalExamAttemptRepository.find({
            where: {
              finalExamUnitId: unit.id,
              userId,
            },
            order: { submittedAt: 'DESC' },
          });

        finalExamSubmissions = userFinalExamSubmissions.map((attempt) => ({
          id: attempt.id,
          attemptNumber: attempt.attemptNumber,
          scorePercent: attempt.scorePercent,
          isPassed: attempt.isPassed,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
        }));

        const inProgressAttempt = userFinalExamSubmissions.find(
          (a) => a.submittedAt === null,
        );

        if (inProgressAttempt) {
          const timeElapsedMs =
            new Date().getTime() - inProgressAttempt.startedAt.getTime();
          finalExamAttemptProgress = {
            attemptId: inProgressAttempt.id,
            attemptNumber: inProgressAttempt.attemptNumber,
            startedAt: inProgressAttempt.startedAt,
            timeElapsedSeconds: Math.floor(timeElapsedMs / 1000),
          };
        }
      }

      return {
        id: unit.id,
        courseId: unit.courseId,
        course: unit.course
          ? {
              id: unit.course.id,
              slug: unit.course.slug,
              title: unit.course.title,
              subtitle: unit.course.subtitle,
              description: unit.course.description,
              level: unit.course.level,
              language: unit.course.language,
              isPublished: unit.course.isPublished,
            }
          : null,
        title: unit.title,
        summary: unit.summary,
        type: unit.type,
        position: unit.position,
        estimatedMinutes: unit.estimatedMinutes,
        isPublished: unit.isPublished,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
        prerequisites: prerequisites.map((p) => ({
          id: p.prerequisiteUnit.id,
          title: p.prerequisiteUnit.title,
          type: p.prerequisiteUnit.type,
          position: p.prerequisiteUnit.position,
        })),
        requiredFor: requiredFor.map((r) => ({
          id: r.unit.id,
          title: r.unit.title,
          type: r.unit.type,
          position: r.unit.position,
        })),
        moduleContent,
        moduleResources,
        ...((unit as any).type !== UnitType.FINAL_EXAM && {
          exercise: { ...exerciseDetail, submissions },
          quiz: quizDetail,
        }),
        finalExam: finalExamDetail,
        ...(finalExamSubmissions.length > 0 && { finalExamSubmissions }),
        ...(finalExamAttemptProgress && { finalExamAttemptProgress }),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('invalid input syntax for type uuid')
      ) {
        throw new NotFoundException('Invalid course ID');
      }
      throw new InternalServerErrorException(
        'Failed to retrieve course details',
      );
    }
  }

  async startFinalExamAttempt(
    userId: string,
    unitId: string,
    finalExamId: string,
  ) {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId, isPublished: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== UnitType.FINAL_EXAM) {
      throw new BadRequestException('Unit type must be final_exam');
    }

    const finalExam = await this.finalExamRepository.findOne({
      where: { unitId },
    });

    if (!finalExam) {
      throw new NotFoundException('Final exam not found');
    }

    const inProgressAttempt = await this.finalExamAttemptRepository.findOne({
      where: {
        finalExamUnitId: unitId,
        userId,
        submittedAt: IsNull(),
      },
    });

    if (inProgressAttempt) {
      // resume existing attempt
      return this.getExamAttemptWithQuestions(
        unitId,
        inProgressAttempt.id,
        inProgressAttempt.attemptNumber,
        inProgressAttempt.startedAt,
      );
    }

    // check for existing submitted attempts
    const submittedAttempts = await this.finalExamAttemptRepository.find({
      where: {
        finalExamUnitId: unitId,
        userId,
        submittedAt: Not(IsNull()),
      },
      order: { submittedAt: 'DESC' },
    });

    const lastSubmittedAttempt = submittedAttempts[0];

    if (lastSubmittedAttempt) {
      if (lastSubmittedAttempt.isPassed) {
        throw new BadRequestException(
          'You have already passed this exam. No further attempts allowed.',
        );
      }
      // reuse failed attempt
      return this.getExamAttemptWithQuestions(
        unitId,
        lastSubmittedAttempt.id,
        lastSubmittedAttempt.attemptNumber,
        lastSubmittedAttempt.startedAt,
      );
    }

    // no previous attempts
    const previousAttempts = await this.finalExamAttemptRepository.count({
      where: {
        finalExamUnitId: unitId,
        userId,
      },
    });

    if (finalExam.maxAttempts && previousAttempts >= finalExam.maxAttempts) {
      throw new BadRequestException('Maximum attempts reached for this exam');
    }

    const attempt = this.finalExamAttemptRepository.create({
      finalExamUnitId: unitId,
      userId,
      startedAt: new Date(),
      attemptNumber: previousAttempts + 1,
    });

    await this.finalExamAttemptRepository.save(attempt);

    return this.getExamAttemptWithQuestions(
      unitId,
      attempt.id,
      attempt.attemptNumber,
      attempt.startedAt,
    );
  }

  private async getExamAttemptWithQuestions(
    unitId: string,
    attemptId: string,
    attemptNumber: number,
    startedAt: Date,
  ) {
    const finalExam = await this.finalExamRepository.findOne({
      where: { unitId },
    });

    if (!finalExam) {
      throw new NotFoundException('Final exam not found');
    }

    // get components and aggregate questions
    const components = await this.finalExamComponentRepository.find({
      where: { finalExamUnitId: unitId },
      relations: ['quiz'],
    });

    const quizComponents = components.filter(
      (c) => c.componentType === FinalExamComponentType.QUIZ,
    );

    const questions: any[] = [];
    const optionsByQuestionId = new Map<string, any[]>();

    for (const component of quizComponents) {
      if (component.quiz) {
        const quizQuestions = await this.quizQuestionRepository.find({
          where: { quizId: component.quiz.id },
          order: { position: 'ASC' },
        });

        const questionIds = quizQuestions.map((q) => q.id);
        const options =
          questionIds.length > 0
            ? await this.quizOptionRepository.find({
                where: { questionId: In(questionIds) },
              })
            : [];

        questionIds.forEach((qId) => {
          optionsByQuestionId.set(
            qId,
            options.filter((o) => o.questionId === qId),
          );
        });

        quizQuestions.forEach((q) => {
          const questionOptions = optionsByQuestionId.get(q.id) || [];
          const correctOptionsCount = questionOptions.filter(
            (o) => o.isCorrect,
          ).length;
          questions.push({
            id: q.id,
            type: 'quiz',
            questionType: q.questionType,
            prompt: q.prompt,
            points: Number(q.points),
            position: q.position,
            answerMultiple: correctOptionsCount > 1,
            options: questionOptions.map((option) => ({
              id: option.id,
              label: option.label,
            })),
          });
        });
      }
    }

    return {
      attemptId,
      attemptNumber,
      startedAt,
      timeElapsedSeconds: Math.floor(
        (new Date().getTime() - startedAt.getTime()) / 1000,
      ),
      exam: {
        unitId: finalExam.unitId,
        title: finalExam.title,
        passingScore: Number(finalExam.passingScore),
        maxAttempts: finalExam.maxAttempts,
        timeLimitSeconds: finalExam.timeLimitSeconds,
        createdAt: finalExam.createdAt,
      },
      questions,
    };
  }

  async submitFinalExamAttempt(
    userId: string,
    unitId: string,
    finalExamId: string,
    dto: FinalExamSubmissionDto,
  ) {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId, isPublished: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== UnitType.FINAL_EXAM) {
      throw new BadRequestException('Unit type must be final_exam');
    }

    const finalExam = await this.finalExamRepository.findOne({
      where: { unitId: finalExamId },
    });

    if (!finalExam) {
      throw new NotFoundException('Final exam not found');
    }

    const attempt = await this.finalExamAttemptRepository.findOne({
      where: {
        finalExamUnitId: unitId,
        userId,
        submittedAt: undefined,
      },
    } as any);

    if (!attempt) {
      throw new BadRequestException(
        'No in-progress attempt found. Please start the exam first.',
      );
    }

    const components = await this.finalExamComponentRepository.find({
      where: { finalExamUnitId: finalExamId },
      relations: ['quiz'],
    });

    const quizComponents = components.filter(
      (c) => c.componentType === FinalExamComponentType.QUIZ,
    );

    if (quizComponents.length === 0) {
      throw new NotFoundException('No quiz components found for this exam');
    }

    // collect all quiz questions from all components
    const allQuestionIds: string[] = [];
    for (const component of quizComponents) {
      if (component.quiz) {
        const questions = await this.quizQuestionRepository.find({
          where: { quizId: component.quiz.id },
        });
        allQuestionIds.push(...questions.map((q) => q.id));
      }
    }

    // validate all submitted question IDs exist in the exam
    const submittedQuestionIds = dto.answers.map((a) => a.questionId);
    for (const qId of submittedQuestionIds) {
      if (!allQuestionIds.includes(qId)) {
        throw new BadRequestException(`Invalid question ID: ${qId}`);
      }
    }

    let totalScore = 0;
    let totalPoints = 0;

    for (const answer of dto.answers) {
      const question = await this.quizQuestionRepository.findOne({
        where: { id: answer.questionId },
      });

      if (!question) {
        throw new NotFoundException(`Question not found: ${answer.questionId}`);
      }

      totalPoints += Number(question.points);

      const correctOptions = await this.quizOptionRepository.find({
        where: {
          questionId: answer.questionId,
          isCorrect: true,
        },
      });

      const correctOptionIds = correctOptions.map((o) => o.id);

      // check if answer is correct
      const selectedSet = new Set(answer.selectedOptionIds);
      const correctSet = new Set(correctOptionIds);

      const isCorrect =
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((id) => correctSet.has(id));

      if (isCorrect) {
        totalScore += Number(question.points);
      }
    }

    const scorePercent = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
    const isPassed = scorePercent >= Number(finalExam.passingScore);

    attempt.submittedAt = new Date();
    attempt.scorePercent = Math.round(scorePercent * 100) / 100;
    attempt.isPassed = isPassed;

    await this.finalExamAttemptRepository.save(attempt);

    if (isPassed) {
      const unitProgress = await this.unitProgressRepository.findOne({
        where: { userId, unitId },
      });

      if (unitProgress) {
        if (unitProgress.status !== UnitProgressStatus.COMPLETED) {
          unitProgress.status = UnitProgressStatus.COMPLETED;
          unitProgress.completedAt = new Date();
          unitProgress.lastScorePercent = attempt.scorePercent;

          await this.unitProgressRepository.save(unitProgress);

          // award XP
          const xpPoints = 100;
          const xpEvent = this.xpEventRepository.create({
            userId,
            eventType: 'unit_completion',
            points: xpPoints,
            sourceType: 'unit',
            sourceId: unitId,
            metadata: {
              unitTitle: unit.title,
              unitType: unit.type,
              completionSource: 'final_exam_submission',
            },
          });

          await this.xpEventRepository.save(xpEvent);

          // check for XP milestone badges
          try {
            const totalXpEvents = await this.xpEventRepository.find({
              where: { userId },
            });
            const totalXp = totalXpEvents.reduce(
              (sum, event) => sum + event.points,
              0,
            );
            await this.badgesService.checkAndAwardXpMilestones(userId, totalXp);
          } catch (error) {
            console.error('Failed to check XP milestones:', error);
          }

          await this.updateCourseProgress(userId, unit.courseId);
          await this.unlockDependentUnits(userId, unitId);

          const courseProgress = await this.courseProgressRepository.findOne({
            where: { userId, courseId: unit.courseId },
            relations: ['course'],
          });

          console.log('[CERT DEBUG] Course progress check:', {
            userId,
            courseId: unit.courseId,
            courseProgress: courseProgress
              ? {
                  progressPercent: courseProgress.progressPercent,
                  completedUnits: courseProgress.completedUnits,
                  totalUnits: courseProgress.totalUnits,
                }
              : null,
          });

          const progressPercent = Number(courseProgress?.progressPercent || 0);
          if (courseProgress && progressPercent >= 100) {
            console.log(
              '[CERT DEBUG] Progress is 100%! Attempting to issue certificate...',
            );
            try {
              // Award first-course badge for this language
              const course = await this.courseRepository.findOne({
                where: { id: unit.courseId },
              });
              if (course) {
                console.log(
                  '[CERT DEBUG] Awarding first-course badge for language:',
                  course.language,
                );
                await this.badgesService.awardFirstCourseBadge(
                  userId,
                  course.language,
                );
              }

              // issue certificate
              console.log(
                '[CERT DEBUG] Issuing certificate for user:',
                userId,
                'course:',
                unit.courseId,
              );
              await this.certificateService.issueCertificate(
                userId,
                unit.courseId,
              );
              console.log('[CERT DEBUG] Certificate issued successfully!');
            } catch (error) {
              console.error(
                '[CERT DEBUG] Failed to issue certificate or award badge:',
                error,
              );
              // don't fail the endpoint if certificate/badge issuance fails
            }
          } else {
            console.log(
              '[CERT DEBUG] Progress is NOT 100%, skipping certificate:',
              courseProgress?.progressPercent,
            );
          }
        }
      }
    }

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      scorePercent: attempt.scorePercent,
      isPassed: attempt.isPassed,
      submittedAt: attempt.submittedAt,
      message: isPassed
        ? 'Exam passed! Unit completed successfully.'
        : `Exam submitted. Score: ${attempt.scorePercent}%. Passing score required: ${finalExam.passingScore}%.`,
    };
  }

  private async updateCourseProgress(userId: string, courseId: string) {
    const courseProgress = await this.courseProgressRepository.findOne({
      where: { userId, courseId },
    });

    if (!courseProgress) {
      return;
    }

    const completedUnits = await this.unitProgressRepository.count({
      where: {
        userId,
        unitId: In(
          (
            await this.unitRepository.find({
              where: { courseId },
              select: ['id'],
            })
          ).map((u) => u.id),
        ),
        status: UnitProgressStatus.COMPLETED,
      },
    });

    courseProgress.completedUnits = completedUnits;
    courseProgress.progressPercent =
      (completedUnits / courseProgress.totalUnits) * 100;

    await this.courseProgressRepository.save(courseProgress);
  }

  private async unlockDependentUnits(userId: string, unitId: string) {
    // find units that depend on this unit
    const prerequisites = await this.unitPrerequisiteRepository.find({
      where: { prerequisiteUnitId: unitId },
      relations: ['unit'],
    });

    for (const prereq of prerequisites) {
      const unitProgress = await this.unitProgressRepository.findOne({
        where: { userId, unitId: prereq.unitId },
      });

      if (unitProgress && unitProgress.status === UnitProgressStatus.LOCKED) {
        // check if all prerequisites are completed
        const allPrereqsMet = await this.checkAllPrerequisitesMet(
          userId,
          prereq.unitId,
        );

        if (allPrereqsMet) {
          unitProgress.status = UnitProgressStatus.AVAILABLE;
          await this.unitProgressRepository.save(unitProgress);
        }
      }
    }
  }

  private async checkAllPrerequisitesMet(
    userId: string,
    unitId: string,
  ): Promise<boolean> {
    const prerequisites = await this.unitPrerequisiteRepository.find({
      where: { unitId },
    });

    for (const prereq of prerequisites) {
      const progress = await this.unitProgressRepository.findOne({
        where: { userId, unitId: prereq.prerequisiteUnitId },
      });

      if (!progress || progress.status !== UnitProgressStatus.COMPLETED) {
        return false;
      }
    }

    return true;
  }
}
