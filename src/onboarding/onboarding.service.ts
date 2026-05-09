import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreference } from '../entities/user-preference.entity';
import {
  OnboardingQuizQuestion,
  QuestionType,
} from '../entities/onboarding/onboarding-quiz-question.entity';
import { OnboardingQuizResponse } from '../entities/onboarding/onboarding-quiz-response.entity';
import { SaveQuizResponsesDto } from './dto/save-quiz-responses.dto';
import { LearningPathService } from '../learning-paths/learning-path.service';

@Injectable()
export class OnboardingService implements OnModuleInit {
  constructor(
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    @InjectRepository(OnboardingQuizQuestion)
    private questionRepository: Repository<OnboardingQuizQuestion>,
    @InjectRepository(OnboardingQuizResponse)
    private responseRepository: Repository<OnboardingQuizResponse>,
    @Inject(forwardRef(() => LearningPathService))
    private learningPathService: LearningPathService,
  ) {}

  async onModuleInit() {
    // initialize default onboarding questions if they don't exist
    await this.initializeDefaultQuestions();
  }

  private async initializeDefaultQuestions() {
    const count = await this.questionRepository.count();

    if (count === 0) {
      const defaultQuestions = [
        {
          question: 'What do you want to learn?',
          description: 'Select the topics you are interested in learning',
          type: QuestionType.MULTIPLE_CHOICE,
          options: [
            'Web Development',
            'Mobile Development',
            'Backend Development',
            'Data Science',
            'Machine Learning',
            'DevOps',
            'UI/UX Design',
            'Game Development',
            'Cybersecurity',
            'Cloud Computing',
          ],
          displayOrder: 1,
          isActive: true,
        },
        {
          question: 'What do you already know?',
          description:
            'Select the technologies or concepts you are already familiar with',
          type: QuestionType.MULTIPLE_CHOICE,
          options: [
            'HTML/CSS',
            'JavaScript',
            'Python',
            'Java',
            'C/C++',
            'SQL',
            'Git',
            'Linux',
            'Algorithms',
            'Data Structures',
            'APIs',
            'Databases',
          ],
          displayOrder: 2,
          isActive: true,
        },
        {
          question: 'Which programming languages have you mastered?',
          description: 'Select the programming languages you are proficient in',
          type: QuestionType.MULTIPLE_CHOICE,
          options: [
            'JavaScript/TypeScript',
            'Python',
            'Java',
            'Go',
            'Rust',
            'C#',
            'PHP',
            'Ruby',
            'Swift',
            'Kotlin',
            'C/C++',
            'None yet',
          ],
          displayOrder: 3,
          isActive: true,
        },
      ];

      for (const questionData of defaultQuestions) {
        const question = this.questionRepository.create(questionData);
        await this.questionRepository.save(question);
      }

      console.log('✅ Default onboarding questions initialized');
    }
  }

  async getQuizQuestions() {
    const questions = await this.questionRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });

    return {
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        description: q.description,
        type: q.type,
        options: q.options,
        displayOrder: q.displayOrder,
      })),
    };
  }

  async saveQuizResponses(userId: string, dto: SaveQuizResponsesDto) {
    const userPreference = await this.userPreferenceRepository.findOne({
      where: { userId },
    });

    if (!userPreference) {
      throw new NotFoundException('User preference not found');
    }

    try {
      // Delete existing responses for this user
      await this.responseRepository.delete({ userId });

      // Save new responses
      for (const response of dto.responses) {
        const quizResponse = this.responseRepository.create({
          userId,
          questionId: response.questionId,
          answer: response.answer,
        });
        await this.responseRepository.save(quizResponse);
      }

      // Mark onboarding as completed
      userPreference.onboardingCompleted = true;
      await this.userPreferenceRepository.save(userPreference);

      // Attempt to assign a learning path based on responses
      await this.learningPathService.assignPathForUser(userId);

      return {
        success: true,
        message: 'Onboarding quiz responses saved successfully',
        onboardingCompleted: true,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('invalid input syntax for type uuid')
      ) {
        throw new NotFoundException('Invalid question ID');
      }
      throw new InternalServerErrorException('Failed to save quiz responses');
    }
  }
}
