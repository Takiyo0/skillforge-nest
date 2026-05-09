import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicShowcase } from '../entities/public-showcase.entity';
import { Course } from '../entities/course/course.entity';
import { Certificate } from '../entities/certificate.entity';
import { CreateShowcaseDto, UpdateShowcaseDto } from './dto/showcase.dto';
import {removeUndefinedProperties} from "../common/utils/object";

// re-export DTOs for backward compatibility
export { CreateShowcaseDto, UpdateShowcaseDto };

@Injectable()
export class ShowcaseService {
  constructor(
    @InjectRepository(PublicShowcase)
    private showcaseRepository: Repository<PublicShowcase>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
  ) {}

  /**
   * Create a new showcase for a course
   */
  async createShowcase(
    userId: string,
    courseId: string,
    createShowcaseDto: CreateShowcaseDto,
  ): Promise<PublicShowcase> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existing = await this.showcaseRepository.findOne({
      where: { userId, courseId },
    });

    if (existing) {
      throw new ConflictException(
        'You already have a showcase for this course',
      );
    }

    // validate certificate if provided
    let certificateId: string | null = null;
    if (createShowcaseDto.certificateId) {
      const cert = await this.certificateRepository.findOne({
        where: { id: createShowcaseDto.certificateId, userId },
      });

      if (!cert) {
        throw new NotFoundException(
          'Certificate not found or does not belong to you',
        );
      }
      certificateId = createShowcaseDto.certificateId;
    }

    const showcase = this.showcaseRepository.create({
      userId,
      courseId,
      certificateId,
      title: createShowcaseDto.title,
      description: createShowcaseDto.description,
      projectUrl: createShowcaseDto.projectUrl,
      isPublic: createShowcaseDto.isPublic ?? true,
    });

    return this.showcaseRepository.save(showcase);
  }

  /**
   * Get user's own showcase
   */
  async getUserShowcase(
    userId: string,
    showcaseId: string,
  ): Promise<PublicShowcase> {
    const showcase = await this.showcaseRepository.findOne({
      where: { id: showcaseId, userId },
      relations: ['user', 'course'],
    });

    if (!showcase) {
      throw new NotFoundException('Showcase not found');
    }

    return showcase;
  }

  /**
   * Get all public showcases (pagination)
   */
  async getPublicShowcases(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: PublicShowcase[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [showcases, total] = await this.showcaseRepository.findAndCount({
      where: { isPublic: true },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: showcases, total, page, limit };
  }

  /**
   * Get showcases for a specific user (public ones only, unless viewing own)
   */
  async getUserShowcases(
    userId: string,
    viewingUserId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: PublicShowcase[];
    total: number;
    page: number;
    limit: number;
  }> {
    const isOwnProfile = userId === viewingUserId;

    const [showcases, total] = await this.showcaseRepository.findAndCount({
      where: isOwnProfile ? { userId } : { userId, isPublic: true },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: showcases, total, page, limit };
  }

  /**
   * Get showcases for a specific course (public only)
   */
  async getCourseShowcases(
    courseId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: PublicShowcase[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [showcases, total] = await this.showcaseRepository.findAndCount({
      where: { courseId, isPublic: true },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: showcases, total, page, limit };
  }

  /**
   * Update showcase
   */
  async updateShowcase(
    userId: string,
    showcaseId: string,
    updateShowcaseDto: UpdateShowcaseDto,
  ): Promise<PublicShowcase> {
    const showcase = await this.showcaseRepository.findOne({
      where: { id: showcaseId, userId },
    });

    if (!showcase) {
      throw new NotFoundException('Showcase not found');
    }

    Object.assign(showcase, removeUndefinedProperties(updateShowcaseDto));
    return this.showcaseRepository.save(showcase);
  }

  /**
   * Delete showcase
   */
  async deleteShowcase(userId: string, showcaseId: string): Promise<void> {
    const showcase = await this.showcaseRepository.findOne({
      where: { id: showcaseId, userId },
    });

    if (!showcase) {
      throw new NotFoundException('Showcase not found');
    }

    await this.showcaseRepository.remove(showcase);
  }
}
