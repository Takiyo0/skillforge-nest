import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FinalExam,
  FinalExamComponent,
  FinalExamComponentType,
  Quiz,
  QuizQuestion,
  QuizQuestionType,
  QuizOption,
  Unit,
  Exercise,
  ExerciseTestCase,
  ExerciseHint,
    FinalExamAttempt,
} from '../../entities';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
} from '../dto/create-exercise.dto';
import {removeUndefinedProperties} from '../../common/utils/object';
import { ensureOwnerOrAdmin } from '../../common/ownership.helper';

@Injectable()
export class AdminFinalExamService {
  constructor(
    @InjectRepository(FinalExam)
    private finalExamRepository: Repository<FinalExam>,
    @InjectRepository(FinalExamComponent)
    private componentRepository: Repository<FinalExamComponent>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizOption)
    private quizOptionRepository: Repository<QuizOption>,
    @InjectRepository(Exercise)
    private exerciseRepository: Repository<Exercise>,
    @InjectRepository(ExerciseTestCase)
    private testCaseRepository: Repository<ExerciseTestCase>,
    @InjectRepository(ExerciseHint)
    private hintRepository: Repository<ExerciseHint>,
    @InjectRepository(FinalExamAttempt)
    private finalExamAttemptRepository: Repository<FinalExamAttempt>,
  ) {}

  private async ensureFinalExamInitialized(unitId: string): Promise<FinalExam> {
    let finalExam = await this.finalExamRepository.findOne({
      where: { unitId },
    });

    if (!finalExam) {
      finalExam = this.finalExamRepository.create({
        unitId,
        title: 'Final Exam',
        passingScore: 75,
        maxAttempts: 3,
      });
      await this.finalExamRepository.save(finalExam);
    }

    return finalExam;
  }

  async getFinalExam(unitId: string): Promise<any> {
    const finalExam = await this.finalExamRepository.findOne({
      where: { unitId },
      relations: ['components', 'components.quiz', 'components.quiz.questions'],
    });

    if (!finalExam) {
      throw new NotFoundException('Final exam not found');
    }

    // load quiz options
    const components = await Promise.all(
      finalExam.components.map(async (component) => {
        if (
          component.componentType === FinalExamComponentType.QUIZ &&
          component.quizId
        ) {
          const quiz = await this.quizRepository.findOne({
            where: { id: component.quizId },
            relations: ['questions', 'questions.options'],
          });

          if (!quiz) {
            return {
              id: component.id,
              componentType: FinalExamComponentType.QUIZ,
              position: component.position,
              weight: component.weight,
              quiz: null,
              questions: [],
            };
          }

          const questions = quiz.questions
            .sort((a, b) => a.position - b.position)
            .map((q) => ({
              id: q.id,
              type: 'quiz',
              questionType: q.questionType,
              prompt: q.prompt,
              explanation: q.explanation,
              points: q.points,
              position: q.position,
              options: q.options
                .sort((a, b) => a.position - b.position)
                .map((o) => ({
                  id: o.id,
                  label: o.label,
                })),
            }));

          return {
            id: component.id,
            componentType: FinalExamComponentType.QUIZ,
            quizId: quiz.id,
            quizTitle: quiz.title,
            position: component.position,
            weight: component.weight,
            questions,
          };
        }

        // exercise component (not implemented yet)
        return {
          id: component.id,
          componentType: FinalExamComponentType.EXERCISE,
          position: component.position,
          weight: component.weight,
          exerciseId: component.exerciseId,
        };
      }),
    );

    return {
      unitId: finalExam.unitId,
      title: finalExam.title,
      passingScore: finalExam.passingScore,
      maxAttempts: finalExam.maxAttempts,
      timeLimitSeconds: finalExam.timeLimitSeconds,
      createdAt: finalExam.createdAt,
      components: components.sort((a, b) => a.position - b.position),
    };
  }

  async createFinalExamQuestion(
    unitId: string,
    createQuestionDto: any,
    userOrUserId: any,
  ): Promise<any> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== 'final_exam') {
      throw new BadRequestException('Unit must be of type final_exam');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    await this.ensureFinalExamInitialized(unitId);

    let quiz = await this.quizRepository.findOne({
      where: { unitId },
      relations: ['questions'],
    });

    if (!quiz) {
      quiz = this.quizRepository.create({
        unitId,
        title: 'Final Exam Quiz',
        passingScore: 75,
      });
      await this.quizRepository.save(quiz);

      // create the quiz component in the final exam
      const component = this.componentRepository.create({
        finalExamUnitId: unitId,
        quizId: quiz.id,
        componentType: FinalExamComponentType.QUIZ,
        position: 1,
        weight: 1,
      });
      await this.componentRepository.save(component);
    }

    // get the next position for the question
    const existingQuestions = await this.quizQuestionRepository.find({
      where: { quizId: quiz.id },
    });
    const nextPosition = existingQuestions.length + 1;

    let questionType = QuizQuestionType.SINGLE_CHOICE;
    if (createQuestionDto.options && createQuestionDto.options.length > 0) {
      const correctOptionsCount = createQuestionDto.options.filter(
        (opt) => opt.isCorrect,
      ).length;
      questionType =
        correctOptionsCount > 1
          ? QuizQuestionType.MULTIPLE_CHOICE
          : QuizQuestionType.SINGLE_CHOICE;
    }

    const question = this.quizQuestionRepository.create({
      quizId: quiz.id,
      prompt: createQuestionDto.prompt,
      questionType,
      explanation: createQuestionDto.explanation,
      points: createQuestionDto.points || 1,
      position: nextPosition,
    });

    const savedQuestion = await this.quizQuestionRepository.save(question);

    if (createQuestionDto.options && createQuestionDto.options.length > 0) {
      for (let i = 0; i < createQuestionDto.options.length; i++) {
        const optionDto = createQuestionDto.options[i];
        const option = this.quizOptionRepository.create({
          questionId: savedQuestion.id,
          label: optionDto.label,
          isCorrect: optionDto.isCorrect,
          position: i + 1,
        });
        await this.quizOptionRepository.save(option);
      }
    }

    return this.getFinalExam(unitId);
  }

  async createFinalExamQuestionOption(
    unitId: string,
    questionId: string,
    createOptionDto: any,
    userOrUserId: any,
  ): Promise<any> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== 'final_exam') {
      throw new BadRequestException('Unit must be of type final_exam');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const question = await this.quizQuestionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'options'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.quiz.unitId !== unitId) {
      throw new BadRequestException(
        'Question does not belong to this final exam',
      );
    }

    const nextPosition = (question.options?.length ?? 0) + 1;

    const option = this.quizOptionRepository.create({
      questionId,
      label: createOptionDto.label,
      isCorrect: createOptionDto.isCorrect,
      position: nextPosition,
    });

    await this.quizOptionRepository.save(option);

    return this.getFinalExam(unitId);
  }

  async updateFinalExamQuestionOption(
    unitId: string,
    questionId: string,
    optionId: string,
    updateOptionDto: any,
    userOrUserId: any,
  ): Promise<any> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== 'final_exam') {
      throw new BadRequestException('Unit must be of type final_exam');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const question = await this.quizQuestionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.quiz.unitId !== unitId) {
      throw new BadRequestException(
        'Question does not belong to this final exam',
      );
    }

    const option = await this.quizOptionRepository.findOne({
      where: { id: optionId },
    });

    if (!option) {
      throw new NotFoundException('Option not found');
    }

    if (option.questionId !== questionId) {
      throw new BadRequestException('Option does not belong to this question');
    }

    Object.assign(option, removeUndefinedProperties(updateOptionDto));
    await this.quizOptionRepository.save(option);

    return this.getFinalExam(unitId);
  }

  async deleteFinalExamQuestionOption(
    unitId: string,
    questionId: string,
    optionId: string,
    userOrUserId: any,
  ): Promise<void> {
      const userId =
          typeof userOrUserId === 'string' ? userOrUserId : userOrUserId?.id;
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== 'final_exam') {
      throw new BadRequestException('Unit must be of type final_exam');
    }

    if (unit.course.createdBy !== userId) {
      throw new BadRequestException('You can only manage your own courses');
    }

    const question = await this.quizQuestionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.quiz.unitId !== unitId) {
      throw new BadRequestException(
        'Question does not belong to this final exam',
      );
    }

    const option = await this.quizOptionRepository.findOne({
      where: { id: optionId },
    });

    if (!option) {
      throw new NotFoundException('Option not found');
    }

    if (option.questionId !== questionId) {
      throw new BadRequestException('Option does not belong to this question');
    }

    await this.quizOptionRepository.delete(optionId);
  }

  async createFinalExamExercise(
    unitId: string,
    createExerciseDto: CreateExerciseDto,
    userOrUserId: any,
  ): Promise<any> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== 'final_exam') {
      throw new BadRequestException('Unit must be of type final_exam');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    await this.ensureFinalExamInitialized(unitId);

    // check if exercise already exists (1-to-1 relationship)
    const existingExercise = await this.exerciseRepository.findOne({
      where: { unitId },
    });

    if (existingExercise) {
      throw new BadRequestException(
        'Exercise already exists for this final exam',
      );
    }

    let exercise = this.exerciseRepository.create({
      ...createExerciseDto,
      unitId,
    });

    exercise = await this.exerciseRepository.save(exercise);

    const existingComponents = await this.componentRepository.find({
      where: { finalExamUnitId: unitId },
    });

    const nextPosition = existingComponents.length + 1;

    const component = this.componentRepository.create({
      finalExamUnitId: unitId,
      exerciseId: exercise.id,
      componentType: FinalExamComponentType.EXERCISE,
      position: nextPosition,
      weight: 1,
    });

    await this.componentRepository.save(component);

    return this.getFinalExam(unitId);
  }

  async updateFinalExamExercise(
    unitId: string,
    updateExerciseDto: UpdateExerciseDto,
    userOrUserId: any,
  ): Promise<any> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== 'final_exam') {
      throw new BadRequestException('Unit must be of type final_exam');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const exercise = await this.exerciseRepository.findOne({
      where: { unitId },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found for this final exam');
    }

    Object.assign(exercise, removeUndefinedProperties(updateExerciseDto));
    await this.exerciseRepository.save(exercise);

    return this.getFinalExam(unitId);
  }

    async deleteFinalExamExercise(
        unitId: string,
        userOrUserId: any,
    ): Promise<void> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type !== 'final_exam') {
      throw new BadRequestException('Unit must be of type final_exam');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const exercise = await this.exerciseRepository.findOne({
      where: { unitId },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found for this final exam');
    }

    await this.componentRepository.delete({
      exerciseId: exercise.id,
      finalExamUnitId: unitId,
    });

    await this.exerciseRepository.delete(exercise.id);
  }

  async updateFinalExamQuestion(
    unitId: string,
    questionId: string,
    updateQuestionDto: any,
    userOrUserId: any,
  ): Promise<any> {
    const finalExam = await this.finalExamRepository.findOne({
      where: { unitId },
    });

    if (!finalExam) {
      throw new NotFoundException('Final exam not found');
    }

    const question = await this.quizQuestionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'quiz.unit', 'quiz.unit.course'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    ensureOwnerOrAdmin(question.quiz.unit.course.createdBy, userOrUserId);

    Object.assign(question, removeUndefinedProperties(updateQuestionDto));
    await this.quizQuestionRepository.save(question);

    return this.getFinalExam(unitId);
  }

  async deleteFinalExamQuestion(
    unitId: string,
    questionId: string,
    userOrUserId: any,
  ): Promise<void> {
    const finalExam = await this.finalExamRepository.findOne({
      where: { unitId },
    });

    if (!finalExam) {
      throw new NotFoundException('Final exam not found');
    }

    const question = await this.quizQuestionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'quiz.unit', 'quiz.unit.course'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    ensureOwnerOrAdmin(question.quiz.unit.course.createdBy, userOrUserId);

    await this.quizQuestionRepository.delete(questionId);
  }

    async resetFinalExamAttempts(
        unitId: string,
        targetUserId: string,
        userOrUserId: any,
    ): Promise<{ reset: boolean; deletedAttempts: number }> {
        const unit = await this.unitRepository.findOne({
            where: {id: unitId},
            relations: ['course'],
        });

        if (!unit) {
            throw new NotFoundException('Unit not found');
        }

        if (unit.type !== 'final_exam') {
            throw new BadRequestException('Unit must be of type final_exam');
        }

        ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

        const result = await this.finalExamAttemptRepository.delete({
            finalExamUnitId: unitId,
            userId: targetUserId,
        });

        return {
            reset: true,
            deletedAttempts: result.affected || 0,
        };
    }
}
