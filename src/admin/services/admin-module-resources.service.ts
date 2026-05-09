import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleResource } from '../../entities/course/module-resource.entity';
import { Unit, UnitType } from '../../entities/course/unit.entity';
import {
  CreateModuleResourceDto,
  UpdateModuleResourceDto,
} from '../dto/create-module-resource.dto';
import {removeUndefinedProperties} from "../../common/utils/object";
import { ensureOwnerOrAdmin } from '../../common/ownership.helper';

@Injectable()
export class AdminModuleResourcesService {
  constructor(
    @InjectRepository(ModuleResource)
    private moduleResourceRepository: Repository<ModuleResource>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
  ) {}

  private async getOwnedUnit(unitId: string, userId: string): Promise<Unit> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
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

    ensureOwnerOrAdmin(unit.course.createdBy, userId);

    return unit;
  }

  async listByUnit(unitId: string, userOrUserId: any): Promise<ModuleResource[]> {
    await this.getOwnedUnit(unitId, userOrUserId);
    return this.moduleResourceRepository.find({
      where: { unitId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    unitId: string,
    dto: CreateModuleResourceDto,
    userOrUserId: any,
  ): Promise<ModuleResource> {
    await this.getOwnedUnit(unitId, userOrUserId);
    const entity = this.moduleResourceRepository.create({
      unitId,
      label: dto.label,
      resourceType: dto.resourceType,
      s3Key: dto.s3Key,
    });
    return this.moduleResourceRepository.save(entity);
  }

  async update(
    resourceId: string,
    dto: UpdateModuleResourceDto,
    userOrUserId: any,
  ): Promise<ModuleResource> {
    const resource = await this.moduleResourceRepository.findOne({
      where: { id: resourceId },
      relations: ['unit', 'unit.course'],
    });

    if (!resource) {
      throw new NotFoundException('Module resource not found');
    }

    ensureOwnerOrAdmin(resource.unit.course.createdBy, userOrUserId);

    Object.assign(resource, removeUndefinedProperties(dto));
    return this.moduleResourceRepository.save(resource);
  }

  async delete(resourceId: string, userOrUserId: any): Promise<void> {
    const resource = await this.moduleResourceRepository.findOne({
      where: { id: resourceId },
      relations: ['unit', 'unit.course'],
    });

    if (!resource) {
      throw new NotFoundException('Module resource not found');
    }

    ensureOwnerOrAdmin(resource.unit.course.createdBy, userOrUserId);

    await this.moduleResourceRepository.remove(resource);
  }
}
