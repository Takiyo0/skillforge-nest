import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Unit, UnitType } from '../../entities/course/unit.entity';
import { UnitPrerequisite } from '../../entities/course/unit-prerequisite.entity';
import { Course } from '../../entities/course/course.entity';
import { ModuleContent } from '../../entities/course/module-content.entity';
import { ModuleResource } from '../../entities/course/module-resource.entity';
import { Exercise } from '../../entities/exercise.entity';
import { ExerciseTestCase } from '../../entities/exercise-test-case.entity';
import { ExerciseHint } from '../../entities/exercise-hint.entity';
import { Quiz } from '../../entities/quiz.entity';
import { QuizQuestion } from '../../entities/quiz-question.entity';
import { QuizOption } from '../../entities/quiz-option.entity';
import { FinalExam } from '../../entities/final-exam.entity';
import { FinalExamComponent } from '../../entities/final-exam-component.entity';
import {
  CreateUnitDto,
  UpdateUnitDto,
  CreateUnitPrerequisiteDto,
} from '../dto/create-unit.dto';
import {removeUndefinedProperties} from '../../common/utils/object';
import { ensureOwnerOrAdmin } from '../../common/ownership.helper';

@Injectable()
export class AdminUnitsService {
  constructor(
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitPrerequisite)
    private unitPrerequisiteRepository: Repository<UnitPrerequisite>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(ModuleContent)
    private moduleContentRepository: Repository<ModuleContent>,
    @InjectRepository(ModuleResource)
    private moduleResourceRepository: Repository<ModuleResource>,
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
    @InjectRepository(FinalExam)
    private finalExamRepository: Repository<FinalExam>,
    @InjectRepository(FinalExamComponent)
    private finalExamComponentRepository: Repository<FinalExamComponent>,
  ) {}

  async createUnit(
    courseId: string,
    createUnitDto: CreateUnitDto,
    userOrUserId: any,
  ): Promise<Unit> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    ensureOwnerOrAdmin(course.createdBy, userOrUserId);

    let position = createUnitDto.position;

      // If position is not provided, determine it automatically
    if (!position) {
      const lastUnit = await this.unitRepository.findOne({
        where: { courseId },
        order: { position: 'DESC' },
      });
      position = (lastUnit?.position ?? 0) + 1;
    }

    const unit = this.unitRepository.create({
      ...createUnitDto,
      courseId,
      position,
    });

    return await this.unitRepository.save(unit);
  }

  async updateUnit(
    unitId: string,
    updateUnitDto: UpdateUnitDto,
    userOrUserId: any,
  ): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    Object.assign(unit, removeUndefinedProperties(updateUnitDto));
    return await this.unitRepository.save(unit);
  }

  async deleteUnit(unitId: string, userOrUserId: any): Promise<void> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    await this.unitRepository.remove(unit);
  }

  async addPrerequisite(
    unitId: string,
    prerequisiteDto: CreateUnitPrerequisiteDto,
    userOrUserId: any,
  ): Promise<UnitPrerequisite> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const prerequisiteUnit = await this.unitRepository.findOne({
      where: { id: prerequisiteDto.prerequisiteUnitId },
    });

    if (!prerequisiteUnit) {
      throw new NotFoundException('Prerequisite unit not found');
    }

    const existingPrerequisite = await this.unitPrerequisiteRepository.findOne({
      where: {
        unitId,
        prerequisiteUnitId: prerequisiteDto.prerequisiteUnitId,
      },
    });

    if (existingPrerequisite) {
      throw new BadRequestException('Prerequisite already exists');
    }

    const prerequisite = this.unitPrerequisiteRepository.create({
      unitId,
      prerequisiteUnitId: prerequisiteDto.prerequisiteUnitId,
    });

    return await this.unitPrerequisiteRepository.save(prerequisite);
  }

  async removePrerequisite(
    unitId: string,
    prerequisiteUnitId: string,
    userOrUserId: any,
  ): Promise<void> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    await this.unitPrerequisiteRepository.delete({
      unitId,
      prerequisiteUnitId,
    });
  }

  async getUnitById(unitId: string, userOrUserId?: any): Promise<any> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Get prerequisites
    const prerequisites = await this.unitPrerequisiteRepository.find({
      where: { unitId },
      relations: ['prerequisiteUnit'],
    });

    const requiredFor = await this.unitPrerequisiteRepository.find({
      where: { prerequisiteUnitId: unitId },
      relations: ['unit'],
    });

    // Build base response
    const response: any = {
      id: unit.id,
      courseId: unit.courseId,
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
      })),
      requiredFor: requiredFor.map((r) => ({
        id: r.unit.id,
        title: r.unit.title,
      })),
    };

    // Get type-specific content
    if (unit.type === UnitType.MODULE) {
      const [moduleContent, moduleResources] = await Promise.all([
        this.moduleContentRepository.findOne({
          where: { unitId },
        }),
        this.moduleResourceRepository.find({
          where: { unitId },
          order: { createdAt: 'DESC' },
        }),
      ]);

      if (moduleContent) {
        response.moduleContent = {
          contentKind: moduleContent.contentKind,
          videoUrl: moduleContent.videoUrl,
          articleMarkdown: moduleContent.articleMarkdown,
          subtitleS3Key: moduleContent.subtitleS3Key,
          playbackSpeeds: moduleContent.playbackSpeeds,
          supportsPip: moduleContent.supportsPip,
        };
      }
      response.moduleResources = moduleResources.map((resource) => ({
        id: resource.id,
        unitId: resource.unitId,
        label: resource.label,
        resourceType: resource.resourceType,
        s3Key: resource.s3Key,
        createdAt: resource.createdAt,
      }));
    } else if (unit.type === UnitType.EXERCISE) {
      const exercise = await this.exerciseRepository.findOne({
        where: { unitId: unit.id },
      });

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

        response.exercise = {
          id: exercise.id,
          difficulty: exercise.difficulty,
          title: exercise.title,
          promptMarkdown: exercise.promptMarkdown,
          language: exercise.language,
          starterCode: exercise.starterCode,
          maxCpuMs: exercise.maxCpuMs,
          maxMemoryKb: exercise.maxMemoryKb,
          createdAt: exercise.createdAt,
          testCases: testCases.map((tc) => ({
            id: tc.id,
            inputText: tc.inputText,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            weight: Number(tc.weight),
          })),
          hints: hints.map((hint) => ({
            id: hint.id,
            hintText: hint.hintText,
            unlockAfterFailedAttempts: hint.unlockAfterFailedAttempts,
            position: hint.position,
          })),
        };
      }
    } else if (unit.type === UnitType.ASSESSMENT) {
      const quiz = await this.quizRepository.findOne({
        where: { unitId: unit.id },
      });

      if (quiz) {
        const questions = await this.quizQuestionRepository.find({
          where: { quizId: quiz.id },
          order: { position: 'ASC' },
        });

        const questionIds = questions.map((q) => q.id);
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

        response.quiz = {
          id: quiz.id,
          title: quiz.title,
          instructions: quiz.instructions,
          passingScore: Number(quiz.passingScore),
          timeLimitSeconds: quiz.timeLimitSeconds,
          randomizeQuestions: quiz.randomizeQuestions,
          randomizeOptions: quiz.randomizeOptions,
          createdAt: quiz.createdAt,
          questions: questions.map((q) => {
            const questionOptions = optionsByQuestionId.get(q.id) || [];
            const correctOptionsCount = questionOptions.filter(
              (o) => o.isCorrect,
            ).length;
            return {
              id: q.id,
              questionType: q.questionType,
              prompt: q.prompt,
              explanation: q.explanation,
              points: Number(q.points),
              position: q.position,
              answerMultiple: correctOptionsCount > 1,
              options: questionOptions.map((option) => ({
                id: option.id,
                label: option.label,
                isCorrect: option.isCorrect,
              })),
            };
          }),
        };
      }
    } else if (unit.type === UnitType.FINAL_EXAM) {
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
                  explanation: q.explanation,
                  points: Number(q.points),
                  position: q.position,
                  answerMultiple: correctOptionsCount > 1,
                  options: questionOptions.map((option) => ({
                    id: option.id,
                    label: option.label,
                    isCorrect: option.isCorrect,
                  })),
                });
              });
            }
          }
        }

        response.finalExam = {
          unitId: finalExam.unitId,
          title: finalExam.title,
          passingScore: Number(finalExam.passingScore),
          maxAttempts: finalExam.maxAttempts,
          timeLimitSeconds: finalExam.timeLimitSeconds,
          createdAt: finalExam.createdAt,
          components: questions,
        };
      }
    }

    return response;
  }
}
