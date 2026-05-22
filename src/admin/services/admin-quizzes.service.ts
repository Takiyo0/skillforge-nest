import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from '../../entities/quiz.entity';
import { QuizQuestion } from '../../entities/quiz-question.entity';
import { QuizOption } from '../../entities/quiz-option.entity';
import { Unit } from '../../entities/course/unit.entity';
import { QuizQuestionType } from '../../entities/quiz-question.entity';
import {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuizQuestionDto,
  CreateQuizOptionDto,
  UpdateQuizQuestionDto,
  UpdateQuizOptionDto,
} from '../dto/create-quiz.dto';
import {removeUndefinedProperties} from '../../common/utils/object';
import { ensureOwnerOrAdmin } from '../../common/ownership.helper';

@Injectable()
export class AdminQuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private questionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizOption)
    private optionRepository: Repository<QuizOption>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
  ) {}

  async createQuiz(
    unitId: string,
    createQuizDto: CreateQuizDto,
    userOrUserId: any,
  ): Promise<Quiz> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const existingQuiz = await this.quizRepository.findOne({
      where: { unitId },
    });

    if (existingQuiz) {
      throw new BadRequestException('Quiz already exists for this unit');
    }

    const quiz = this.quizRepository.create({
      ...createQuizDto,
      unitId,
    });

    return await this.quizRepository.save(quiz);
  }

  async updateQuiz(
    quizId: string,
    updateQuizDto: UpdateQuizDto,
    userOrUserId: any,
  ): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['unit', 'unit.course'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    ensureOwnerOrAdmin(quiz.unit.course.createdBy, userOrUserId);

    Object.assign(quiz, removeUndefinedProperties(updateQuizDto));
    return await this.quizRepository.save(quiz);
  }

  async deleteQuiz(quizId: string, userOrUserId: any): Promise<void> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['unit', 'unit.course'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    ensureOwnerOrAdmin(quiz.unit.course.createdBy, userOrUserId);

    await this.quizRepository.remove(quiz);
  }

  async addQuestion(
    quizId: string,
    createQuestionDto: CreateQuizQuestionDto,
    userOrUserId: any,
  ): Promise<QuizQuestion> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['unit', 'unit.course'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    ensureOwnerOrAdmin(quiz.unit.course.createdBy, userOrUserId);

    const existingQuestions = await this.questionRepository.find({
      where: { quizId },
    });
    const position = existingQuestions.length + 1;

    const correctCount = createQuestionDto.options.filter(
      (opt) => opt.isCorrect,
    ).length;
    const questionType =
      correctCount === 1
        ? QuizQuestionType.SINGLE_CHOICE
        : QuizQuestionType.MULTIPLE_CHOICE;

    const question = this.questionRepository.create({
      quizId,
      prompt: createQuestionDto.prompt,
      questionType,
      points: createQuestionDto.points || 1,
      explanation: createQuestionDto.explanation,
      position,
    });

    const savedQuestion = await this.questionRepository.save(question);

    for (let i = 0; i < createQuestionDto.options.length; i++) {
      const optionDto = createQuestionDto.options[i];
      const option = this.optionRepository.create({
        questionId: savedQuestion.id,
        label: optionDto.label,
        isCorrect: optionDto.isCorrect,
        position: i + 1,
      });
      await this.optionRepository.save(option);
    }

    return (await this.questionRepository.findOne({
      where: { id: savedQuestion.id },
      relations: ['options'],
    })) as QuizQuestion;
  }

  async updateQuestion(
    questionId: string,
    updateQuestionDto: UpdateQuizQuestionDto,
    userOrUserId: any,
  ): Promise<QuizQuestion> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'quiz.unit', 'quiz.unit.course'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    ensureOwnerOrAdmin(question.quiz.unit.course.createdBy, userOrUserId);

    Object.assign(question, removeUndefinedProperties(updateQuestionDto));
    return await this.questionRepository.save(question);
  }

  async deleteQuestion(questionId: string, userOrUserId: any): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'quiz.unit', 'quiz.unit.course'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    ensureOwnerOrAdmin(question.quiz.unit.course.createdBy, userOrUserId);

    await this.questionRepository.remove(question);
  }

  async addOption(
    questionId: string,
    createOptionDto: CreateQuizOptionDto,
    userOrUserId: any,
  ): Promise<QuizOption> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['quiz', 'quiz.unit', 'quiz.unit.course', 'options'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    ensureOwnerOrAdmin(question.quiz.unit.course.createdBy, userOrUserId);

    const nextPosition = (question.options?.length ?? 0) + 1;

    const option = this.optionRepository.create({
      questionId,
      label: createOptionDto.label,
      isCorrect: createOptionDto.isCorrect,
      position: createOptionDto.position ?? nextPosition,
    });

    return await this.optionRepository.save(option);
  }

  async updateOption(
    optionId: string,
    updateOptionDto: UpdateQuizOptionDto,
    userOrUserId: any,
  ): Promise<QuizOption> {
    const option = await this.optionRepository.findOne({
      where: { id: optionId },
      relations: [
        'question',
        'question.quiz',
        'question.quiz.unit',
        'question.quiz.unit.course',
      ],
    });

    if (!option) {
      throw new NotFoundException('Option not found');
    }

      ensureOwnerOrAdmin(
          option.question.quiz.unit.course.createdBy,
          userOrUserId,
      );

    Object.assign(option, removeUndefinedProperties(updateOptionDto));
    return await this.optionRepository.save(option);
  }

  async deleteOption(optionId: string, userOrUserId: any): Promise<void> {
    const option = await this.optionRepository.findOne({
      where: { id: optionId },
      relations: [
        'question',
        'question.quiz',
        'question.quiz.unit',
        'question.quiz.unit.course',
      ],
    });

    if (!option) {
      throw new NotFoundException('Option not found');
    }

      ensureOwnerOrAdmin(
          option.question.quiz.unit.course.createdBy,
          userOrUserId,
      );

    await this.optionRepository.remove(option);
  }

  async getQuizById(quizId: string, userOrUserId?: any): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (userOrUserId) {
      ensureOwnerOrAdmin((quiz as any).unit?.course?.createdBy, userOrUserId);
    }

    return quiz;
  }
}
