import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../entities/badge.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { User } from '../entities/user.entity';
import {
  BadgeCriteriaDefinition,
  BadgeCriteriaTypes,
  CreateBadgeDto,
  UpdateBadgeDto,
} from '../admin/dto/badge.dto';
import { SUPPORTED_CODE_LANGUAGES } from '../common/constants/supported-languages';

interface BadgeConfig {
  code: string;
  name: string;
  description: string;
  criteria?: Record<string, any>;
}

@Injectable()
export class BadgesService {
  // language-specific badge configurations
  private readonly languageBadges: Record<string, BadgeConfig> = {
    javascript: {
      code: 'javascript_explorer',
      name: 'JavaScript Explorer',
      description:
        'Completed your first JavaScript course! The web awaits you.',
      criteria: { type: 'first_course', language: 'javascript' },
    },
    typescript: {
      code: 'typescript_architect',
      name: 'TypeScript Architect',
      description:
        'Completed your first TypeScript course! Type safety mastered.',
      criteria: { type: 'first_course', language: 'typescript' },
    },
    python: {
      code: 'python_apprentice',
      name: 'Python Apprentice',
      description:
        'Completed your first Python course! Let the serpent guide you.',
      criteria: { type: 'first_course', language: 'python' },
    },
    java: {
      code: 'java_warrior',
      name: 'Java Warrior',
      description: 'Completed your first Java course! The adventure begins.',
      criteria: { type: 'first_course', language: 'java' },
    },
    c: {
      code: 'c_craftsman',
      name: 'C Craftsman',
      description: 'Completed your first C course! Close to the metal.',
      criteria: { type: 'first_course', language: 'c' },
    },
    cpp: {
      code: 'cpp_architect',
      name: 'C++ Architect',
      description:
        'Completed your first C++ course! Power and control unlocked.',
      criteria: { type: 'first_course', language: 'cpp' },
    },
    rust: {
      code: 'rust_pioneer',
      name: 'Rust Pioneer',
      description: 'Completed your first Rust course! Memory safety achieved.',
      criteria: { type: 'first_course', language: 'rust' },
    },
    go: {
      code: 'go_friend',
      name: 'Go Friend',
      description:
        'Completed your first Go course! Welcome to the gopher community.',
      criteria: { type: 'first_course', language: 'go' },
    },
    ruby: {
      code: 'ruby_jewel',
      name: 'Ruby Jewel',
      description: 'Completed your first Ruby course! Elegant code mastered.',
      criteria: { type: 'first_course', language: 'ruby' },
    },
    php: {
      code: 'php_craftsman',
      name: 'PHP Craftsman',
      description: 'Completed your first PHP course! Web development unlocked.',
      criteria: { type: 'first_course', language: 'php' },
    },
    default: {
      code: 'polyglot_{language}',
      name: '{language} Master',
      description: 'Completed your first {language} course!',
      criteria: { type: 'first_course' },
    },
  };

  // XP milestone badges
  private readonly xpMilestoneBadges = [
    {
      xp: 1000,
      code: 'xp_novice',
      name: 'XP Novice',
      description: 'Earned 1,000 XP! You are off to a great start.',
    },
    {
      xp: 2000,
      code: 'xp_apprentice',
      name: 'XP Apprentice',
      description: 'Earned 2,000 XP! Skills are sharpening.',
    },
    {
      xp: 3000,
      code: 'xp_practitioner',
      name: 'XP Practitioner',
      description: 'Earned 3,000 XP! Expertise is showing.',
    },
    {
      xp: 5000,
      code: 'xp_expert',
      name: 'XP Expert',
      description: 'Earned 5,000 XP! You are becoming legendary.',
    },
    {
      xp: 10000,
      code: 'xp_master',
      name: 'XP Master',
      description: 'Earned 10,000 XP! True mastery achieved.',
    },
  ];

  constructor(
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
  ) {}

  private readonly criteriaMetadata: BadgeCriteriaDefinition[] = [
    {
      type: BadgeCriteriaTypes.FirstCourse,
      label: 'First course',
      description:
        'Awarded when a learner completes their first course in a selected language.',
      fields: [
        {
          key: 'language',
          label: 'Language',
          type: 'select',
          required: true,
          options: SUPPORTED_CODE_LANGUAGES.map((language) => ({
            value: language,
            label: language,
          })),
          helperText: 'Choose the language the badge should be tied to.',
        },
      ],
    },
    {
      type: BadgeCriteriaTypes.XpMilestone,
      label: 'XP milestone',
      description:
        'Awarded when a learner reaches a specific total XP threshold.',
      fields: [
        {
          key: 'xp',
          label: 'XP threshold',
          type: 'number',
          required: true,
          min: 1,
          step: 1,
          helperText: 'Use a positive whole number such as 1000 or 5000.',
        },
      ],
    },
  ];

  /**
   * Award a badge to a user by code. Creates badge if it doesn't exist.
   */
  async awardBadgeByCode(
    userId: string,
    badgeCode: string,
  ): Promise<UserBadge | null> {
    const badge = await this.badgeRepository.findOne({
      where: { code: badgeCode },
    });

    if (!badge) {
      const config = this.findBadgeConfig(badgeCode);
      if (!config) {
        return null;
      }

      const createdBadge = await this.badgeRepository.save({
        code: badgeCode,
        name: config.name,
        description: config.description,
        criteria: config.criteria || {},
      });
      return this.userBadgeRepository.save(
        this.userBadgeRepository.create({
          userId,
          badgeId: createdBadge.id,
        }),
      );
    }

    const existing = await this.userBadgeRepository.findOne({
      where: { userId, badgeId: badge.id },
    });

    if (existing) {
      return null;
    }

    // award badge to user
    const userBadge = this.userBadgeRepository.create({
      userId,
      badgeId: badge.id,
    });

    return this.userBadgeRepository.save(userBadge);
  }

  /**
   * Award first-course badge when user completes their first course in a language
   */
  async awardFirstCourseBadge(
    userId: string,
    language: string,
  ): Promise<boolean> {
    const badgeCode = this.getLanguageBadgeCode(language);
    const awarded = await this.awardBadgeByCode(userId, badgeCode);
    return !!awarded;
  }

  /**
   * Check and award XP milestone badges based on total XP
   */
  async checkAndAwardXpMilestones(
    userId: string,
    currentTotalXp: number,
  ): Promise<string[]> {
    const awardedBadges: string[] = [];

    for (const milestone of this.xpMilestoneBadges) {
      if (currentTotalXp >= milestone.xp) {
        const awarded = await this.awardBadgeByCode(userId, milestone.code);
        if (awarded) {
          awardedBadges.push(milestone.code);
        }
      }
    }

    return awardedBadges;
  }

  /**
   * Get badge code for a language (handles custom names)
   */
  private getLanguageBadgeCode(language: string): string {
    const config = this.languageBadges[language.toLowerCase()];
    if (config) {
      return config.code;
    }

    // use template for unknown languages
    const defaultConfig = this.languageBadges.default;
    return defaultConfig.code.replace('{language}', language.toLowerCase());
  }

  /**
   * Find badge config by code, supporting dynamic generation
   */
  private findBadgeConfig(badgeCode: string): BadgeConfig | null {
    // check predefined badges
    for (const config of Object.values(this.languageBadges)) {
      if (config.code === badgeCode) {
        return config;
      }
    }

    for (const milestone of this.xpMilestoneBadges) {
      if (milestone.code === badgeCode) {
        return {
          code: milestone.code,
          name: milestone.name,
          description: milestone.description,
          criteria: { type: 'xp_milestone', xp: milestone.xp },
        };
      }
    }

    return null;
  }

  /**
   * Initialize default badges in database (admin action)
   */
  async initializeDefaultBadges(): Promise<Badge[]> {
    const created: Badge[] = [];

    // create language badges
    for (const config of Object.values(this.languageBadges)) {
      const existing = await this.badgeRepository.findOne({
        where: { code: config.code },
      });
      if (!existing) {
        const badge = await this.badgeRepository.save({
          code: config.code,
          name: config.name,
          description: config.description,
          criteria: config.criteria || {},
        });
        created.push(badge);
      }
    }

    for (const milestone of this.xpMilestoneBadges) {
      const existing = await this.badgeRepository.findOne({
        where: { code: milestone.code },
      });
      if (!existing) {
        const badge = await this.badgeRepository.save({
          code: milestone.code,
          name: milestone.name,
          description: milestone.description,
          criteria: { type: 'xp_milestone', xp: milestone.xp },
        });
        created.push(badge);
      }
    }

    return created;
  }

  /**
   * Get all available badges
   */
  async getAllBadges(): Promise<Badge[]> {
    return this.badgeRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async getBadgeById(badgeId: string): Promise<Badge> {
    const badge = await this.badgeRepository.findOne({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return badge;
  }

  getBadgeCriteriaMetadata(): BadgeCriteriaDefinition[] {
    return this.criteriaMetadata;
  }

  private buildCriteria(
      dto: Pick<
          CreateBadgeDto | UpdateBadgeDto,
          'criteriaType' | 'language' | 'xp'
      >,
  ): Record<string, any> | undefined {
    if (!dto.criteriaType) {
      return undefined;
    }

    if (dto.criteriaType === BadgeCriteriaTypes.FirstCourse) {
      if (!dto.language) {
        throw new BadRequestException(
          'language is required when criteriaType is first_course',
        );
      }

      return {
        type: BadgeCriteriaTypes.FirstCourse,
        language: dto.language,
      };
    }

    if (dto.criteriaType === BadgeCriteriaTypes.XpMilestone) {
      if (dto.xp === undefined || dto.xp === null) {
        throw new BadRequestException(
          'xp is required when criteriaType is xp_milestone',
        );
      }

      return {
        type: BadgeCriteriaTypes.XpMilestone,
        xp: dto.xp,
      };
    }

    return undefined;
  }

  private async assertBadgeCodeAvailable(
    code: string,
    ignoreBadgeId?: string,
  ): Promise<void> {
    const existing = await this.badgeRepository.findOne({
      where: { code },
    });

    if (existing && existing.id !== ignoreBadgeId) {
      throw new ConflictException('Badge code already exists');
    }
  }

  async createBadge(dto: CreateBadgeDto): Promise<Badge> {
    await this.assertBadgeCodeAvailable(dto.code);

    const badge = this.badgeRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description || '',
      iconS3Key: dto.iconS3Key || null,
      criteria: this.buildCriteria(dto) || {},
    });

    return this.badgeRepository.save(badge);
  }

  async updateBadge(badgeId: string, dto: UpdateBadgeDto): Promise<Badge> {
    const badge = await this.getBadgeById(badgeId);

    if (dto.code && dto.code !== badge.code) {
      await this.assertBadgeCodeAvailable(dto.code, badge.id);
      badge.code = dto.code;
    }

    if (dto.name !== undefined) {
      badge.name = dto.name;
    }

    if (dto.description !== undefined) {
      badge.description = dto.description;
    }

    if (dto.iconS3Key !== undefined) {
      badge.iconS3Key = dto.iconS3Key || null;
    }

    if (dto.criteriaType) {
      badge.criteria = this.buildCriteria(dto) || {};
    }

    return this.badgeRepository.save(badge);
  }

  async deleteBadge(badgeId: string): Promise<void> {
    const badge = await this.getBadgeById(badgeId);
    await this.badgeRepository.remove(badge);
  }

  /**
   * Get user badges with details
   */
  async getUserBadges(userId: string) {
    const userBadges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { awardedAt: 'DESC' },
    });

    return {
      userId,
      totalBadges: userBadges.length,
      badges: userBadges.map((ub) => ({
        badgeId: ub.badge.id,
        code: ub.badge.code,
        name: ub.badge.name,
        description: ub.badge.description,
        iconS3Key: ub.badge.iconS3Key,
        awardedAt: ub.awardedAt,
      })),
    };
  }
}
