import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { SaveQuizResponsesDto } from './dto/save-quiz-responses.dto';

@ApiTags('Onboarding')
@Controller()
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get('onboarding/quiz')
  @ApiOperation({
    summary: 'Get onboarding quiz questions',
    description: 'Retrieve all quiz questions for the onboarding flow',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions retrieved successfully',
    schema: {
      example: {
        questions: [
          {
            id: 'q1',
            question: 'What is your preferred programming language?',
            options: ['Python', 'JavaScript', 'Java', 'C++'],
            type: 'multiple-choice',
          },
        ],
      },
    },
  })
  async getQuizQuestions() {
    return this.onboardingService.getQuizQuestions();
  }

  @Post('onboarding/quiz-responses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Save onboarding quiz responses',
    description: 'Save user responses to onboarding quiz questions',
  })
  @ApiBody({
    type: SaveQuizResponsesDto,
    description: 'Quiz responses from the user',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz responses saved successfully',
    schema: {
      example: {
        id: 'response-001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        responses: [
          {
            questionId: 'q1',
            selectedOption: 'Python',
          },
        ],
        savedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid quiz responses format',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async saveQuizResponses(
    @CurrentUser() user: User,
    @Body() saveQuizResponsesDto: SaveQuizResponsesDto,
  ) {
    return this.onboardingService.saveQuizResponses(
      user.id,
      saveQuizResponsesDto,
    );
  }
}
