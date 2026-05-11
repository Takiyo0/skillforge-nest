import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Enrollment,
  EnrollmentStatus,
} from '../entities/progress/enrollment.entity';
import { CourseProgress } from '../entities/progress/course-progress.entity';
import {
  UnitProgress,
  UnitProgressStatus,
} from '../entities/progress/unit-progress.entity';
import { Course } from '../entities/course/course.entity';
import { Unit, UnitType } from '../entities/course/unit.entity';
import { UnitPrerequisite } from '../entities/course/unit-prerequisite.entity';
import { XpEvent } from '../entities/xp-event.entity';
import { BadgesService } from '../badges/badges.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(CourseProgress)
    private courseProgressRepository: Repository<CourseProgress>,
    @InjectRepository(UnitProgress)
    private unitProgressRepository: Repository<UnitProgress>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
    @InjectRepository(UnitPrerequisite)
    private unitPrerequisiteRepository: Repository<UnitPrerequisite>,
    @InjectRepository(XpEvent)
    private xpEventRepository: Repository<XpEvent>,
    private badgesService: BadgesService,
  ) {}

  async enrollInCourse(userId: string, courseId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, isPublished: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });

    if (existingEnrollment) {
      throw new ConflictException('Already enrolled in this course');
    }

    // create enrollment
    const enrollment = this.enrollmentRepository.create({
      userId,
      courseId,
      status: EnrollmentStatus.ACTIVE,
    });

    await this.enrollmentRepository.save(enrollment);

    const units = await this.unitRepository.find({
      where: { courseId, isPublished: true },
      order: { position: 'ASC' },
    });

    for (const unit of units) {
      // check if unit has prerequisites
      const hasPrereqs = await this.unitPrerequisiteRepository.count({
        where: { unitId: unit.id },
      });

      // first unit with no prerequisites is available, others are locked
      const status =
        hasPrereqs === 0
          ? UnitProgressStatus.AVAILABLE
          : UnitProgressStatus.LOCKED;

      const unitProgress = this.unitProgressRepository.create({
        userId,
        unitId: unit.id,
        status,
      });

      await this.unitProgressRepository.save(unitProgress);
    }

    // initialize course progress
    const courseProgress = this.courseProgressRepository.create({
      userId,
      courseId,
      completedUnits: 0,
      totalUnits: units.length,
      progressPercent: 0,
      currentUnitId: units.length > 0 ? units[0].id : null,
    });

    await this.courseProgressRepository.save(courseProgress);

    return {
      success: true,
      message: 'Successfully enrolled in course',
      enrollmentStatus: EnrollmentStatus.ACTIVE,
    };
  }

  async getCourseProgress(userId: string, courseId: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
      relations: ['course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this course');
    }

    const courseProgress = await this.courseProgressRepository.findOne({
      where: { userId, courseId },
    });

    const units = await this.unitRepository.find({
      where: { courseId, isPublished: true },
      order: { position: 'ASC' },
    });

    const unitProgressList = await Promise.all(
      units.map(async (unit) => {
        const progress = await this.unitProgressRepository.findOne({
          where: { userId, unitId: unit.id },
        });

        return {
          unitId: unit.id,
          title: unit.title,
          type: unit.type,
          position: unit.position,
          status: progress?.status || UnitProgressStatus.AVAILABLE,
          lastScorePercent: progress?.lastScorePercent,
          startedAt: progress?.startedAt,
          completedAt: progress?.completedAt,
        };
      }),
    );

    const completedCount = unitProgressList.filter(
      (up) => up.status === UnitProgressStatus.COMPLETED,
    ).length;

    return {
      courseId,
      courseTitle: enrollment.course.title,
      enrollmentStatus: enrollment.status,
      progressPercent: courseProgress?.progressPercent || 0,
      unitProgress: unitProgressList,
      completedUnits: completedCount,
      totalUnits: unitProgressList.length,
    };
  }

  async startUnit(userId: string, unitId: string) {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId, isPublished: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const unitProgress = await this.unitProgressRepository.findOne({
      where: { userId, unitId },
    });

    if (!unitProgress) {
      throw new NotFoundException(
        'Unit progress not found. Please enroll in the course first.',
      );
    }

    if (
      unitProgress.status !== UnitProgressStatus.AVAILABLE &&
      unitProgress.status !== UnitProgressStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(
        `Cannot start unit with status: ${unitProgress.status}`,
      );
    }

    unitProgress.status = UnitProgressStatus.IN_PROGRESS;
    if (!unitProgress.startedAt) {
      unitProgress.startedAt = new Date();
    }

    await this.unitProgressRepository.save(unitProgress);

    return {
      success: true,
      unitId,
      status: UnitProgressStatus.IN_PROGRESS,
      startedAt: unitProgress.startedAt,
    };
  }

  async completeUnit(userId: string, unitId: string) {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId, isPublished: true },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    if (unit.type === UnitType.EXERCISE) {
      throw new BadRequestException(
        'Exercise units are completed automatically when a submission passes',
      );
    }

    if (unit.type === UnitType.ASSESSMENT) {
      throw new BadRequestException(
        'Quiz units are completed automatically when all answers are correct',
      );
    }

    if (unit.type === UnitType.FINAL_EXAM) {
      throw new BadRequestException(
        'Final exam units are completed automatically when the exam is passed',
      );
    }

    const unitProgress = await this.unitProgressRepository.findOne({
      where: { userId, unitId },
    });

    if (!unitProgress) {
      throw new NotFoundException('Unit progress not found');
    }

    if (unitProgress.status === UnitProgressStatus.COMPLETED) {
      return {
        success: true,
        message: 'Unit already completed',
        unitId,
        status: UnitProgressStatus.COMPLETED,
      };
    }

    if (unitProgress.status !== UnitProgressStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete unit with status: ${unitProgress.status}`,
      );
    }

    unitProgress.status = UnitProgressStatus.COMPLETED;
    unitProgress.completedAt = new Date();
    unitProgress.lastScorePercent = 100;

    await this.unitProgressRepository.save(unitProgress);

    // award XP
    const xpPoints = 100;
    const xpEvent = this.xpEventRepository.create({
      userId,
      eventType: 'unit_completion',
      points: xpPoints,
      sourceType: 'unit',
      sourceId: unitId,
      metadata: {
        unitTitle: unit.title,
        unitType: unit.type,
      },
    });
    await this.xpEventRepository.save(xpEvent);

    // check for XP milestone badges
    try {
      const totalXpEvents = await this.xpEventRepository.find({
        where: { userId },
      });
      const totalXp = totalXpEvents.reduce(
        (sum, event) => sum + event.points,
        0,
      );
      await this.badgesService.checkAndAwardXpMilestones(userId, totalXp);
    } catch (error) {
      console.error('Failed to check XP milestones:', error);
    }

    await this.updateCourseProgress(userId, unit.courseId);

    await this.unlockDependentUnits(userId, unitId);

    return {
      success: true,
      message: 'Unit completed successfully',
      unitId,
      status: UnitProgressStatus.COMPLETED,
      xpEarned: xpPoints,
      completedAt: unitProgress.completedAt,
    };
  }

  async completeExerciseUnitBySubmission(
    userId: string,
    unitId: string,
    submissionId: string,
    scorePercent = 100,
  ) {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId, isPublished: true },
    });

    if (!unit || unit.type !== UnitType.EXERCISE) {
      return;
    }

    const unitProgress = await this.unitProgressRepository.findOne({
      where: { userId, unitId },
    });

    if (!unitProgress) {
      return;
    }

    if (unitProgress.status === UnitProgressStatus.COMPLETED) {
      return;
    }

    if (
      unitProgress.status !== UnitProgressStatus.AVAILABLE &&
      unitProgress.status !== UnitProgressStatus.IN_PROGRESS
    ) {
      return;
    }

    if (!unitProgress.startedAt) {
      unitProgress.startedAt = new Date();
    }

    unitProgress.status = UnitProgressStatus.COMPLETED;
    unitProgress.completedAt = new Date();
    unitProgress.lastScorePercent = scorePercent;
    unitProgress.lastSubmissionId = submissionId;
    await this.unitProgressRepository.save(unitProgress);

    const xpPoints = 100;
    const xpEvent = this.xpEventRepository.create({
      userId,
      eventType: 'unit_completion',
      points: xpPoints,
      sourceType: 'unit',
      sourceId: unitId,
      metadata: {
        unitTitle: unit.title,
        unitType: unit.type,
        completionSource: 'exercise_submission',
      },
    });
    await this.xpEventRepository.save(xpEvent);

    await this.updateCourseProgress(userId, unit.courseId);
    await this.unlockDependentUnits(userId, unitId);
  }

  async completeQuizUnitBySubmission(
    userId: string,
    unitId: string,
    _submissionId: string,
    scorePercent: number,
  ) {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId, isPublished: true },
    });

    if (!unit || unit.type !== UnitType.ASSESSMENT) {
      return;
    }

    // only auto-complete if score is 100% (all answers correct)
    if (scorePercent !== 100) {
      return;
    }

    const unitProgress = await this.unitProgressRepository.findOne({
      where: { userId, unitId },
    });

    if (!unitProgress) {
      return;
    }

    if (unitProgress.status === UnitProgressStatus.COMPLETED) {
      return;
    }

    if (
      unitProgress.status !== UnitProgressStatus.AVAILABLE &&
      unitProgress.status !== UnitProgressStatus.IN_PROGRESS
    ) {
      return;
    }

    if (!unitProgress.startedAt) {
      unitProgress.startedAt = new Date();
    }

    unitProgress.status = UnitProgressStatus.COMPLETED;
    unitProgress.completedAt = new Date();
    unitProgress.lastScorePercent = scorePercent;
    await this.unitProgressRepository.save(unitProgress);

    const xpPoints = 100;
    const xpEvent = this.xpEventRepository.create({
      userId,
      eventType: 'unit_completion',
      points: xpPoints,
      sourceType: 'unit',
      sourceId: unitId,
      metadata: {
        unitTitle: unit.title,
        unitType: unit.type,
        completionSource: 'quiz_submission',
      },
    });
    await this.xpEventRepository.save(xpEvent);

    await this.updateCourseProgress(userId, unit.courseId);
    await this.unlockDependentUnits(userId, unitId);
  }

  private async updateCourseProgress(userId: string, courseId: string) {
    const courseProgress = await this.courseProgressRepository.findOne({
      where: { userId, courseId },
    });

    if (!courseProgress) {
      return;
    }

    const units = await this.unitRepository.find({
      where: { courseId, isPublished: true },
    });

    const unitIds = units.map((u) => u.id);
    const completedUnits = await this.unitProgressRepository.count({
      where: {
        userId,
        unitId: In(unitIds),
        status: UnitProgressStatus.COMPLETED,
      },
    });

    courseProgress.completedUnits = completedUnits;
    courseProgress.totalUnits = units.length;
    courseProgress.progressPercent = parseFloat(
      ((completedUnits / units.length) * 100).toFixed(2),
    );

    await this.courseProgressRepository.save(courseProgress);
  }

  private async unlockDependentUnits(userId: string, completedUnitId: string) {
    const dependentUnits = await this.unitPrerequisiteRepository.find({
      where: { prerequisiteUnitId: completedUnitId },
    });

    for (const depUnit of dependentUnits) {
      const allPrereqs = await this.unitPrerequisiteRepository.find({
        where: { unitId: depUnit.unitId },
      });

      const allPrereqsCompleted = await Promise.all(
        allPrereqs.map(async (prereq) => {
          const prereqProgress = await this.unitProgressRepository.findOne({
            where: { userId, unitId: prereq.prerequisiteUnitId },
          });
          return prereqProgress?.status === UnitProgressStatus.COMPLETED;
        }),
      );

      // if all prerequisites are completed, unlock this unit
      if (allPrereqsCompleted.every((completed) => completed)) {
        const unitProgress = await this.unitProgressRepository.findOne({
          where: { userId, unitId: depUnit.unitId },
        });

        if (unitProgress && unitProgress.status === UnitProgressStatus.LOCKED) {
          unitProgress.status = UnitProgressStatus.AVAILABLE;
          await this.unitProgressRepository.save(unitProgress);
        }
      }
    }
  }
}
