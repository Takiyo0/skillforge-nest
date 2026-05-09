import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPath, LearningPathCourse } from '../entities';
import { Course } from '../entities/course/course.entity';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';
import { AddCoursesToPathDto } from './dto/add-courses-to-path.dto';

@Injectable()
export class LearningPathAdminService {
  constructor(
    @InjectRepository(LearningPath)
    private learningPathRepository: Repository<LearningPath>,
    @InjectRepository(LearningPathCourse)
    private learningPathCourseRepository: Repository<LearningPathCourse>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  /**
   * Create a new learning path
   */
  async createPath(dto: CreateLearningPathDto): Promise<LearningPath> {
    const slugExists = await this.learningPathRepository.findOne({
      where: { slug: dto.slug },
    });

    if (slugExists) {
      throw new BadRequestException('Slug already exists');
    }

    const path = this.learningPathRepository.create({
      slug: dto.slug,
      title: dto.title,
      description: dto.description,
      criteria: dto.criteria || {},
      isPublic: dto.isPublic ?? true,
    });

    return this.learningPathRepository.save(path);
  }

  /**
   * Get all learning paths (admin view)
   */
  async getAllPaths() {
    const paths = await this.learningPathRepository.find({
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
        isPublic: path.isPublic,
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
   * Get a specific learning path
   */
  async getPath(pathId: string) {
    const path = await this.learningPathRepository.findOne({
      where: { id: pathId },
      relations: ['courses.course'],
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    return {
      id: path.id,
      slug: path.slug,
      title: path.title,
      description: path.description,
      criteria: path.criteria,
      isPublic: path.isPublic,
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
      updatedAt: path.updatedAt,
    };
  }

  /**
   * Update a learning path
   */
  async updatePath(pathId: string, dto: UpdateLearningPathDto) {
    const path = await this.learningPathRepository.findOne({
      where: { id: pathId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    if (dto.slug && dto.slug !== path.slug) {
      const slugExists = await this.learningPathRepository.findOne({
        where: { slug: dto.slug },
      });
      if (slugExists) {
        throw new BadRequestException('Slug already exists');
      }
      path.slug = dto.slug;
    }

    if (dto.title) path.title = dto.title;
    if (dto.description) path.description = dto.description;
    if (dto.criteria) path.criteria = dto.criteria;
    if (dto.isPublic !== undefined) path.isPublic = dto.isPublic;

    return this.learningPathRepository.save(path);
  }

  /**
   * Delete a learning path
   */
  async deletePath(pathId: string) {
    const path = await this.learningPathRepository.findOne({
      where: { id: pathId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    await this.learningPathRepository.remove(path);
    return { success: true, message: 'Learning path deleted' };
  }

  /**
   * Add courses to a learning path in specific order
   */
  async addCoursesToPath(pathId: string, dto: AddCoursesToPathDto) {
    const path = await this.learningPathRepository.findOne({
      where: { id: pathId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    for (const courseId of dto.courseIds) {
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
      });
      if (!course) {
        throw new BadRequestException(`Course ${courseId} not found`);
      }
    }

    await this.learningPathCourseRepository.delete({ learningPathId: pathId });

    for (let i = 0; i < dto.courseIds.length; i++) {
      const lpc = this.learningPathCourseRepository.create({
        learningPathId: pathId,
        courseId: dto.courseIds[i],
        position: i + 1,
      });
      await this.learningPathCourseRepository.save(lpc);
    }

    return {
      success: true,
      message: 'Courses added to learning path',
      courseCount: dto.courseIds.length,
    };
  }

  /**
   * Remove a course from a learning path
   */
  async removeCourseFromPath(pathId: string, courseId: string) {
    const lpc = await this.learningPathCourseRepository.findOne({
      where: { learningPathId: pathId, courseId },
    });

    if (!lpc) {
      throw new NotFoundException('Course not found in this learning path');
    }

    await this.learningPathCourseRepository.remove(lpc);

    const remaining = await this.learningPathCourseRepository.find({
      where: { learningPathId: pathId },
      order: { position: 'ASC' },
    });

    for (let i = 0; i < remaining.length; i++) {
      remaining[i].position = i + 1;
      await this.learningPathCourseRepository.save(remaining[i]);
    }

    return { success: true, message: 'Course removed from learning path' };
  }

  /**
   * Reorder courses in a learning path
   */
  async reorderCourses(pathId: string, courseIds: string[]) {
    const path = await this.learningPathRepository.findOne({
      where: { id: pathId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    for (let i = 0; i < courseIds.length; i++) {
      const lpc = await this.learningPathCourseRepository.findOne({
        where: { learningPathId: pathId, courseId: courseIds[i] },
      });

      if (!lpc) {
        throw new BadRequestException(
          `Course ${courseIds[i]} not found in this path`,
        );
      }

      lpc.position = i + 1;
      await this.learningPathCourseRepository.save(lpc);
    }

    return { success: true, message: 'Courses reordered' };
  }
}
