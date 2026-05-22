import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BadgesService } from './badges/badges.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private badgesService: BadgesService) {}

  async onModuleInit() {
    this.logger.log('Initializing default badges...');
    try {
      const created = await this.badgesService.initializeDefaultBadges();
      this.logger.log(
        `Badge initialization complete. Created ${created.length} new badges.`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize badges:', error);
    }
  }

  getHello(): object {
    return {
      ok: true,
      message: 'Welcome to the SkillForge API!',
    };
  }
}
