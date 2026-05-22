import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleContent } from '../../entities/course/module-content.entity';
import { Unit } from '../../entities/course/unit.entity';
import {
  CreateModuleContentDto,
  UpdateModuleContentDto,
} from '../dto/create-module-content.dto';
import {removeUndefinedProperties} from '../../common/utils/object';
import { ensureOwnerOrAdmin } from '../../common/ownership.helper';

@Injectable()
export class AdminModuleContentService {
  constructor(
    @InjectRepository(ModuleContent)
    private moduleContentRepository: Repository<ModuleContent>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
  ) {}

  async createModuleContent(
    unitId: string,
    createModuleContentDto: CreateModuleContentDto,
    userOrUserId: any,
  ): Promise<ModuleContent> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const moduleContent = new ModuleContent();
    moduleContent.unitId = unitId;
    moduleContent.contentKind = createModuleContentDto.contentKind;
    if (createModuleContentDto.videoUrl) {
      moduleContent.videoUrl = createModuleContentDto.videoUrl;
    }
    if (createModuleContentDto.articleMarkdown) {
      moduleContent.articleMarkdown = createModuleContentDto.articleMarkdown;
    }
    if (createModuleContentDto.subtitleS3Key) {
      moduleContent.subtitleS3Key = createModuleContentDto.subtitleS3Key;
    }
    if (createModuleContentDto.playbackSpeeds) {
      moduleContent.playbackSpeeds = createModuleContentDto.playbackSpeeds;
    }
    if (createModuleContentDto.supportsPip !== undefined) {
      moduleContent.supportsPip = createModuleContentDto.supportsPip;
    }

    return await this.moduleContentRepository.save(moduleContent);
  }

  async updateModuleContent(
    unitId: string,
    updateModuleContentDto: UpdateModuleContentDto,
    userOrUserId: any,
  ): Promise<ModuleContent> {
    const content = await this.moduleContentRepository.findOne({
      where: { unitId },
      relations: ['unit', 'unit.course'],
    });

    if (!content) {
      throw new NotFoundException('Module content not found');
    }

    ensureOwnerOrAdmin(content.unit.course.createdBy, userOrUserId);

    Object.assign(content, removeUndefinedProperties(updateModuleContentDto));
    return await this.moduleContentRepository.save(content);
  }

  async deleteModuleContent(unitId: string, userOrUserId: any): Promise<void> {
    const content = await this.moduleContentRepository.findOne({
      where: { unitId },
      relations: ['unit', 'unit.course'],
    });

    if (!content) {
      throw new NotFoundException('Module content not found');
    }

    ensureOwnerOrAdmin(content.unit.course.createdBy, userOrUserId);

    await this.moduleContentRepository.remove(content);
  }

    async getModuleContentByUnit(
        unitId: string,
        userOrUserId?: any,
    ): Promise<ModuleContent | null> {
    const content = await this.moduleContentRepository.findOne({
      where: { unitId },
      relations: ['unit', 'unit.course'],
    });

    if (!content) return null;

    if (userOrUserId) {
      ensureOwnerOrAdmin(content.unit.course.createdBy, userOrUserId);
    }

    return content;
  }
}
