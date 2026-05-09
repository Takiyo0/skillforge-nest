import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Course, CourseLevel} from '../../entities/course/course.entity';
import {CreateCourseDto, UpdateCourseDto} from '../dto/create-course.dto';
import {removeUndefinedProperties} from "../../common/utils/object";
import { ensureOwnerOrAdmin } from '../../common/ownership.helper';

@Injectable()
export class AdminCoursesService {
    constructor(
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
    ) {
    }

    async createCourse(
        userId: string,
        createCourseDto: CreateCourseDto,
    ): Promise<Course> {
        const slug = this.generateSlug(createCourseDto.title);

        const existingCourse = await this.courseRepository.findOne({
            where: {slug},
        });

        if (existingCourse) {
            throw new ConflictException(`Course with slug "${slug}" already exists`);
        }

        const course = this.courseRepository.create({
            ...createCourseDto,
            slug,
            createdBy: userId,
        });

        return await this.courseRepository.save(course);
    }

    async updateCourse(
        courseId: string,
        userOrUserId: any,
        updateCourseDto: UpdateCourseDto,
    ): Promise<Course> {
        const course = await this.courseRepository.findOne({
            where: {id: courseId},
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }



        ensureOwnerOrAdmin(course.createdBy, userOrUserId);

        if (updateCourseDto.title && updateCourseDto.title !== course.title) {
            const newSlug = this.generateSlug(updateCourseDto.title);
            const existingCourse = await this.courseRepository.findOne({
                where: {slug: newSlug},
            });

            if (existingCourse && existingCourse.id !== courseId) {
                throw new ConflictException(
                    `Course with slug "${newSlug}" already exists`,
                );
            }

            course.slug = newSlug;
        }

        Object.assign(course, removeUndefinedProperties(updateCourseDto));
        await this.courseRepository.save(course);
        return course;
    }

    async deleteCourse(courseId: string, userOrUserId: any): Promise<void> {
        const course = await this.courseRepository.findOne({
            where: {id: courseId},
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        ensureOwnerOrAdmin(course.createdBy, userOrUserId);

        await this.courseRepository.remove(course);
    }

    async publishCourse(courseId: string, userOrUserId: any): Promise<Course> {
        const course = await this.courseRepository.findOne({
            where: {id: courseId},
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        ensureOwnerOrAdmin(course.createdBy, userOrUserId);

        course.isPublished = true;
        return await this.courseRepository.save(course);
    }

    async unpublishCourse(courseId: string, userOrUserId: any): Promise<Course> {
        const course = await this.courseRepository.findOne({
            where: {id: courseId},
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        ensureOwnerOrAdmin(course.createdBy, userOrUserId);

        course.isPublished = false;
        return await this.courseRepository.save(course);
    }

    async getInstructorCourses(userId: string): Promise<Course[]> {
        return await this.courseRepository.find({
            where: {createdBy: userId},
            relations: ['units', 'creator'],
            order: {createdAt: 'DESC'},
        });
    }

    async getAllCourses(): Promise<Course[]> {
        return await this.courseRepository.find({
            relations: ['units', 'creator'],
            order: {createdAt: 'DESC'},
        });
    }

    async getCourseById(courseId: string, userOrUserId?: any): Promise<Course> {
        const course = await this.courseRepository.findOne({
            where: {id: courseId},
            relations: ['units', 'creator'],
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        if (userOrUserId) {
            ensureOwnerOrAdmin(course.createdBy, userOrUserId);
        }

        return course;
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}
