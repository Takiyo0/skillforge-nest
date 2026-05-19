import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Quizzes')
@Controller()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('units/:unitId/quizzes/:quizId/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Submit quiz',
    description: 'Submit completed quiz answers and receive immediate grading',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiParam({
    name: 'quizId',
    description: 'Unique identifier of the quiz',
    type: 'string',
  })
  @ApiBody({
    type: SubmitQuizDto,
    description: 'Quiz submission with answers',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz submitted and graded successfully',
    schema: {
      example: {
        submissionId: 'quiz-sub-001',
        score: 90,
        totalQuestions: 10,
        correctAnswers: 9,
        passed: true,
        feedback: [
          {
            questionId: 'q-001',
            correct: true,
            explanation: 'Correct!',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid submission format or already submitted',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz or unit not found',
  })
  async submitQuiz(
    @Param('unitId') unitId: string,
    @Param('quizId') quizId: string,
    @Body() submitDto: SubmitQuizDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user id not found');
    }

    return this.quizzesService.submitQuiz(quizId, userId, submitDto);
  }

  @Get('units/:unitId/quizzes/:quizId/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get quiz submissions',
    description: 'Retrieve all quiz submissions for the authenticated user',
  })
  @ApiParam({
    name: 'unitId',
    description: 'Unique identifier of the unit',
    type: 'string',
  })
  @ApiParam({
    name: 'quizId',
    description: 'Unique identifier of the quiz',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz submissions retrieved successfully',
    schema: {
      example: {
        quizId: 'quiz-001',
        submissions: [
          {
            submissionId: 'quiz-sub-001',
            score: 90,
            submittedAt: '2024-01-20T10:30:00Z',
            passed: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Quiz or unit not found',
  })
  async getQuizSubmissions(
    @Param('unitId') unitId: string,
    @Param('quizId') quizId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user id not found');
    }

    return this.quizzesService.getQuizSubmissions(quizId, userId);
  }

  @Get('units/:unitId/quizzes/:quizId/submissions/:attemptId/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Review a finished quiz attempt',
    description:
      'Returns attempt-based review. For failed attempts, correct answers and explanations are hidden.',
  })
  async getQuizAttemptReview(
    @Param('quizId') quizId: string,
    @Param('attemptId') attemptId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user id not found');
    }

    return this.quizzesService.getQuizAttemptReview(quizId, attemptId, userId);
  }
}
