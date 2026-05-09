import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPath, LearningPathCourse } from '../entities';
import { UserPreference } from '../entities/user-preference.entity';
import { Course } from '../entities/course/course.entity';
import { OnboardingQuizResponse } from '../entities/onboarding/onboarding-quiz-response.entity';

@Injectable()
export class LearningPathService {
  constructor(
    @InjectRepository(LearningPath)
    private learningPathRepository: Repository<LearningPath>,
    @InjectRepository(LearningPathCourse)
    private learningPathCourseRepository: Repository<LearningPathCourse>,
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(OnboardingQuizResponse)
    private responseRepository: Repository<OnboardingQuizResponse>,
  ) {}

  /**
   * Get all public learning paths
   */
  async getAllPaths() {
    const paths = await this.learningPathRepository.find({
      where: { isPublic: true },
      relations: ['courses.course'],
      order: { createdAt: 'ASC' },
    });

    return {
      data: paths.map((path) => ({
        id: path.id,
        slug: path.slug,
        title: path.title,
        description: path.description,
        criteria: path.criteria,
        courses: path.courses
          .sort((a, b) => a.position - b.position)
          .map((lpc) => ({
            courseId: lpc.courseId,
            courseName: lpc.course.title,
            courseSlug: lpc.course.slug,
            courseLevel: lpc.course.level,
            courseLanguage: lpc.course.language,
            courseDescription: lpc.course.description,
            courseThumbnail: lpc.course.thumbnailS3Key,
            position: lpc.position,
          })),
        createdAt: path.createdAt,
      })),
    };
  }

  /**
   * Get user's current assigned learning path
   */
  async getUserPath(userId: string) {
    const userPref = await this.userPreferenceRepository.findOne({
      where: { userId },
      relations: ['learningPath.courses.course'],
    });

    if (!userPref || !userPref.learningPath) {
      return null;
    }

    const path = userPref.learningPath;
    return {
      id: path.id,
      slug: path.slug,
      title: path.title,
      description: path.description,
      criteria: path.criteria,
      courses: path.courses
        .sort((a, b) => a.position - b.position)
        .map((lpc) => ({
          courseId: lpc.courseId,
          courseName: lpc.course.title,
          courseSlug: lpc.course.slug,
          courseLevel: lpc.course.level,
          courseLanguage: lpc.course.language,
          courseDescription: lpc.course.description,
          courseThumbnail: lpc.course.thumbnailS3Key,
          position: lpc.position,
        })),
      createdAt: path.createdAt,
    };
  }

  /**
   * Auto-assign learning path based on onboarding responses
   */
  async assignPathForUser(userId: string): Promise<string | null> {
    const responses = await this.responseRepository.find({
      where: { userId },
      relations: ['question'],
    });

    // parse responses into a map
    const answerMap = new Map<string, string[]>();
    for (const response of responses) {
      const questionText = response.question.question;
      const answer = Array.isArray(response.answer)
        ? response.answer
        : [response.answer];
      answerMap.set(questionText, answer);
    }

    // Get all paths with criteria
    const allPaths = await this.learningPathRepository.find({
      where: { isPublic: true },
    });

    // Find matching path by checking criteria
    let bestMatch: LearningPath | null = null;
    let bestScore = 0;

    for (const path of allPaths) {
      const criteria = path.criteria || {};
      let score = 0;
      let totalWeight = 0;

      // Check each criterion
      if (criteria.wantToLearn && Array.isArray(criteria.wantToLearn)) {
        totalWeight++;
        const userWants = answerMap.get('What do you want to learn?') || [];
        const matchCount = criteria.wantToLearn.filter((item: string) =>
          userWants.includes(item),
        ).length;
        if (matchCount > 0) {
          score += 1;
        }
      }

      if (criteria.alreadyKnow && Array.isArray(criteria.alreadyKnow)) {
        totalWeight++;
        const userKnows = answerMap.get('What do you already know?') || [];
        const matchCount = criteria.alreadyKnow.filter((item: string) =>
          userKnows.includes(item),
        ).length;
        if (matchCount > 0) {
          score += 1;
        }
      }

      if (criteria.languages && Array.isArray(criteria.languages)) {
        totalWeight++;
        const userLanguages =
          answerMap.get('Which programming languages have you mastered?') || [];
        const matchCount = criteria.languages.filter((lang: string) =>
          userLanguages.includes(lang),
        ).length;
        if (matchCount > 0) {
          score += 1;
        }
      }

      // Calculate score (normalize if weight exists)
      const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;

      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = path;
      }
    }

    // If match found, assign to user
    if (bestMatch) {
      const userPref = await this.userPreferenceRepository.findOne({
        where: { userId },
      });

      if (userPref) {
        userPref.learningPathId = bestMatch.id;
        await this.userPreferenceRepository.save(userPref);
        return bestMatch.id;
      }
    }

    return null;
  }
}
