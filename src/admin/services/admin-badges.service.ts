import { Injectable } from '@nestjs/common';
import { BadgesService } from '../../badges/badges.service';
import { CreateBadgeDto, UpdateBadgeDto } from '../dto/badge.dto';

@Injectable()
export class AdminBadgesService {
  constructor(private badgesService: BadgesService) {}

  async initializeDefaultBadges() {
    return this.badgesService.initializeDefaultBadges();
  }

  async getAllBadges() {
    return this.badgesService.getAllBadges();
  }

  async getBadgeById(badgeId: string) {
    return this.badgesService.getBadgeById(badgeId);
  }

  async getBadgeCriteriaMetadata() {
    return this.badgesService.getBadgeCriteriaMetadata();
  }

  async createBadge(dto: CreateBadgeDto) {
    return this.badgesService.createBadge(dto);
  }

  async updateBadge(badgeId: string, dto: UpdateBadgeDto) {
    return this.badgesService.updateBadge(badgeId, dto);
  }

  async deleteBadge(badgeId: string) {
    return this.badgesService.deleteBadge(badgeId);
  }
}
