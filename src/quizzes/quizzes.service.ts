import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Quiz,
  QuizQuestion,
  QuizOption,
  QuizAttempt,
  QuizAttemptAnswer,
  Unit,
} from '../entities';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizResultDto, QuizAnswerResultDto } from './dto/quiz-result.dto';
import { QuizResponseDto } from './dto/quiz-response.dto';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private questionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuizOption)
    private optionRepository: Repository<QuizOption>,
    @InjectRepository(QuizAttempt)
    private attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(QuizAttemptAnswer)
    private answerRepository: Repository<QuizAttemptAnswer>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    private progressService: ProgressService,
  ) {}

  async getQuizByUnit(unitId: string): Promise<QuizResponseDto> {
    const quiz = await this.quizRepository.findOne({
      where: { unitId },
      relations: ['questions', 'questions.options'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found for this unit');
    }

    return {
      id: quiz.id,
      title: quiz.title,
      instructions: quiz.instructions,
      passingScore: quiz.passingScore,
      timeLimitSeconds: quiz.timeLimitSeconds,
      randomizeQuestions: quiz.randomizeQuestions,
      randomizeOptions: quiz.randomizeOptions,
      questions: quiz.questions
        .sort((a, b) => a.position - b.position)
        .map((q) => {
          const correctOptionsCount = q.options.filter(
            (o) => o.isCorrect,
          ).length;
          return {
            id: q.id,
            questionType: q.questionType,
            prompt: q.prompt,
            points: q.points,
            position: q.position,
            answerMultiple: correctOptionsCount > 1,
            options: q.options
              .sort((a, b) => a.position - b.position)
              .map((o) => ({
                id: o.id,
                label: o.label,
              })),
          };
        }),
    };
  }

  async submitQuiz(
    quizId: string,
    userId: string,
    submitDto: SubmitQuizDto,
  ): Promise<QuizResultDto> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const previousAttempts = await this.attemptRepository.count({
      where: { quizId, userId },
    });
    const attemptNumber = previousAttempts + 1;

    const attempt = this.attemptRepository.create({
      quizId,
      userId,
      attemptNumber,
      startedAt: new Date(),
    });

    const savedAttempt = await this.attemptRepository.save(attempt);

    // grade answers
    const answers: QuizAttemptAnswer[] = [];
    const answerResults: QuizAnswerResultDto[] = [];
    let totalScore = 0;
    let earnedScore = 0;

    for (const answerDto of submitDto.answers) {
      const question = quiz.questions.find(
        (q) => q.id === answerDto.questionId,
      );
      if (!question) {
        throw new BadRequestException(
          `Question ${answerDto.questionId} not found`,
        );
      }

      const correctOptions = question.options.filter((o) => o.isCorrect);
      const selectedSet = new Set(answerDto.selectedOptionIds);
      const correctSet = new Set(correctOptions.map((o) => o.id));

      const isCorrect =
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((id) => correctSet.has(id));

      const pointsValue = Number(question.points);
      const scoreAwarded = isCorrect ? pointsValue : 0;
      totalScore += pointsValue;
      earnedScore += scoreAwarded;

      const answer = this.answerRepository.create({
        attemptId: savedAttempt.id,
        questionId: question.id,
        selectedOptionIds: answerDto.selectedOptionIds,
        answerText: answerDto.answerText,
        isCorrect,
        scoreAwarded,
      });

      answers.push(answer);
      answerResults.push({
        questionId: question.id,
        selectedOptionIds: answerDto.selectedOptionIds,
        scoreAwarded,
        explanation: question.explanation,
      });
    }

    await this.answerRepository.save(answers);

    // calculate final score
    const scorePercent = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0;
    const isPassed = scorePercent >= quiz.passingScore;

    savedAttempt.submittedAt = new Date();
    savedAttempt.scorePercent = scorePercent;
    savedAttempt.isPassed = isPassed;
    await this.attemptRepository.save(savedAttempt);

    // auto-complete quiz unit if all answers are correct (100% score)
    if (scorePercent === 100) {
      try {
        const unit = await this.unitRepository.findOne({
          where: { id: quiz.unitId },
        });

        if (unit) {
          await this.progressService.completeQuizUnitBySubmission(
            userId,
            quiz.unitId,
            savedAttempt.id,
            scorePercent,
          );
        }
      } catch (error) {
        console.error('Failed to auto-complete quiz unit:', error);
      }
    }

    return {
      attemptId: savedAttempt.id,
      quizId: quiz.id,
      scorePercent,
      isPassed,
      attemptNumber,
      submittedAt: savedAttempt.submittedAt,
      answers: answerResults,
    };
  }

  async getQuizSubmissions(quizId: string, userId: string) {
    const submissions = await this.attemptRepository.find({
      where: { quizId, userId },
      relations: ['answers', 'answers.question'],
      order: { submittedAt: 'DESC' },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      attemptNumber: submission.attemptNumber,
      scorePercent: submission.scorePercent,
      isPassed: submission.isPassed,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      answers: submission.answers.map((answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds,
        isCorrect: answer.isCorrect,
        scoreAwarded: answer.scoreAwarded,
      })),
    }));
  }
}
