import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {extname} from 'path';
import {Course} from '../../entities/course/course.entity';
import {Unit, UnitType} from '../../entities/course/unit.entity';
import {ModuleResource} from '../../entities/course/module-resource.entity';
import {Badge} from '../../entities/badge.entity';
import {S3Service} from '../../common/s3.service';
import {ensureOwnerOrAdmin} from '../../common/ownership.helper';
import {assertUploadedFileAllowed} from '../../common/upload-limits';

@Injectable()
export class AdminMediaUploadService {
    constructor(
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        @InjectRepository(Unit)
        private unitRepository: Repository<Unit>,
        @InjectRepository(ModuleResource)
        private moduleResourceRepository: Repository<ModuleResource>,
        @InjectRepository(Badge)
        private badgeRepository: Repository<Badge>,
        private s3Service: S3Service,
    ) {
    }

    private getSafeExtension(originalName: string): string {
        const ext = extname(originalName || '').toLowerCase();
        return ext && ext.length <= 10 ? ext : '';
    }

    async uploadCourseThumbnail(
        courseId: string,
        file: Express.Multer.File | undefined,
        userOrUserId: any,
    ): Promise<Course> {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Course banner must be an image');
        }
        await assertUploadedFileAllowed(file, 'image');

        const course = await this.courseRepository.findOne({
            where: {id: courseId},
        });
        if (!course) {
            throw new NotFoundException('Course not found');
        }


        ensureOwnerOrAdmin(course.createdBy, userOrUserId);

        const ext = this.getSafeExtension(file.originalname);
        const fileName = `course-thumbnail-${Date.now()}${ext}`;
        const key = await this.s3Service.uploadFile(
            file.buffer,
            file.mimetype,
            `courses/${courseId}/thumbnails`,
            fileName,
        );

        course.thumbnailS3Key = key;
        return this.courseRepository.save(course);
    }

    async uploadModuleVideo(
        unitId: string,
        file: Express.Multer.File | undefined,
        userOrUserId: any,
    ): Promise<{ s3Key: string; videoUrl: string }> {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        if (!file.mimetype.startsWith('video/')) {
            throw new BadRequestException('Module video must be a video file');
        }
        await assertUploadedFileAllowed(file, 'video');

        const unit = await this.unitRepository.findOne({
            where: {id: unitId},
            relations: ['course'],
        });
        if (!unit) {
            throw new NotFoundException('Unit not found');
        }
        if (unit.type !== UnitType.MODULE) {
            throw new BadRequestException('Only module units can upload video');
        }
        ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

        const ext = this.getSafeExtension(file.originalname);
        const fileName = `module-video-${Date.now()}${ext}`;
        const key = await this.s3Service.uploadFile(
            file.buffer,
            file.mimetype,
            `units/${unitId}/videos`,
            fileName,
        );

        return {
            s3Key: key,
            videoUrl: this.s3Service.getPublicUrl(key),
        };
    }

    async uploadModuleResource(
        unitId: string,
        file: Express.Multer.File | undefined,
        userOrUserId: any,
        label?: string,
        resourceType?: string,
    ): Promise<{ resource: ModuleResource; fileUrl: string }> {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        await assertUploadedFileAllowed(file, 'file');

        const unit = await this.unitRepository.findOne({
            where: {id: unitId},
            relations: ['course'],
        });
        if (!unit) {
            throw new NotFoundException('Unit not found');
        }
        if (unit.type !== UnitType.MODULE) {
            throw new BadRequestException(
                'Resources are only supported for module units',
            );
        }
        ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

        const ext = this.getSafeExtension(file.originalname);
        const fileName = `resource-${Date.now()}${ext}`;
        const key = await this.s3Service.uploadFile(
            file.buffer,
            file.mimetype,
            `units/${unitId}/resources`,
            fileName,
        );

        const resource = this.moduleResourceRepository.create({
            unitId,
            label: (label?.trim() || file.originalname || 'Attachment').slice(0, 180),
            resourceType: (resourceType?.trim() || file.mimetype || 'file').slice(
                0,
                40,
            ),
            s3Key: key,
        });

        const saved = await this.moduleResourceRepository.save(resource);
        return {
            resource: saved,
            fileUrl: this.s3Service.getPublicUrl(saved.s3Key),
        };
    }

    async uploadBadgeIcon(
        badgeId: string,
        file: Express.Multer.File | undefined,
    ): Promise<Badge> {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Badge icon must be an image');
        }
        await assertUploadedFileAllowed(file, 'image');

        const badge = await this.badgeRepository.findOne({
            where: {id: badgeId},
        });
        if (!badge) {
            throw new NotFoundException('Badge not found');
        }

        const ext = this.getSafeExtension(file.originalname);
        const fileName = `badge-icon-${Date.now()}${ext}`;
        const key = await this.s3Service.uploadFile(
            file.buffer,
            file.mimetype,
            `badges/${badgeId}/icons`,
            fileName,
        );

        badge.iconS3Key = key;
        return this.badgeRepository.save(badge);
    }
}
