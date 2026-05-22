import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from '../../entities/exercise.entity';
import { ExerciseTestCase } from '../../entities/exercise-test-case.entity';
import { ExerciseHint } from '../../entities/exercise-hint.entity';
import { Unit } from '../../entities/course/unit.entity';
import {
  CreateExerciseDto,
  UpdateExerciseDto,
  CreateTestCaseDto,
  UpdateTestCaseDto,
  CreateHintDto,
  UpdateHintDto,
} from '../dto/create-exercise.dto';
import {removeUndefinedProperties} from '../../common/utils/object';
import { ensureOwnerOrAdmin } from '../../common/ownership.helper';

@Injectable()
export class AdminExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private exerciseRepository: Repository<Exercise>,
    @InjectRepository(ExerciseTestCase)
    private testCaseRepository: Repository<ExerciseTestCase>,
    @InjectRepository(ExerciseHint)
    private hintRepository: Repository<ExerciseHint>,
    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,
  ) {}

  async createExercise(
    unitId: string,
    createExerciseDto: CreateExerciseDto,
    userOrUserId: any,
  ): Promise<Exercise> {
    const unit = await this.unitRepository.findOne({
      where: { id: unitId },
      relations: ['course'],
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    ensureOwnerOrAdmin(unit.course.createdBy, userOrUserId);

    const existingExercise = await this.exerciseRepository.findOne({
      where: { unitId },
    });

    if (existingExercise) {
      throw new BadRequestException('Exercise already exists for this unit');
    }

    const exercise = this.exerciseRepository.create({
      ...createExerciseDto,
      unitId,
    });

    return await this.exerciseRepository.save(exercise);
  }

  async updateExercise(
    exerciseId: string,
    updateExerciseDto: UpdateExerciseDto,
    userOrUserId: any,
  ): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId },
      relations: ['unit', 'unit.course'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    ensureOwnerOrAdmin(exercise.unit.course.createdBy, userOrUserId);

    Object.assign(exercise, removeUndefinedProperties(updateExerciseDto));
    return await this.exerciseRepository.save(exercise);
  }

  async deleteExercise(exerciseId: string, userOrUserId: any): Promise<void> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId },
      relations: ['unit', 'unit.course'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    ensureOwnerOrAdmin(exercise.unit.course.createdBy, userOrUserId);

    await this.exerciseRepository.remove(exercise);
  }

  async addTestCase(
    exerciseId: string,
    createTestCaseDto: CreateTestCaseDto,
    userOrUserId: any,
  ): Promise<ExerciseTestCase> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId },
      relations: ['unit', 'unit.course'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    ensureOwnerOrAdmin(exercise.unit.course.createdBy, userOrUserId);

    const testCase = this.testCaseRepository.create({
      ...createTestCaseDto,
      exerciseId,
    });

    return await this.testCaseRepository.save(testCase);
  }

  async updateTestCase(
    testCaseId: string,
    updateTestCaseDto: UpdateTestCaseDto,
    userOrUserId: any,
  ): Promise<ExerciseTestCase> {
    const testCase = await this.testCaseRepository.findOne({
      where: { id: testCaseId },
      relations: ['exercise', 'exercise.unit', 'exercise.unit.course'],
    });

    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    ensureOwnerOrAdmin(testCase.exercise.unit.course.createdBy, userOrUserId);

    Object.assign(testCase, removeUndefinedProperties(updateTestCaseDto));
    return await this.testCaseRepository.save(testCase);
  }

  async deleteTestCase(testCaseId: string, userOrUserId: any): Promise<void> {
    const testCase = await this.testCaseRepository.findOne({
      where: { id: testCaseId },
      relations: ['exercise', 'exercise.unit', 'exercise.unit.course'],
    });

    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    ensureOwnerOrAdmin(testCase.exercise.unit.course.createdBy, userOrUserId);

    await this.testCaseRepository.remove(testCase);
  }

  async addHint(
    exerciseId: string,
    createHintDto: CreateHintDto,
    userOrUserId: any,
  ): Promise<ExerciseHint> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId },
      relations: ['unit', 'unit.course'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    ensureOwnerOrAdmin(exercise.unit.course.createdBy, userOrUserId);

    const nextPosition =
      (await this.hintRepository.count({ where: { exerciseId } })) + 1;

    const hint = this.hintRepository.create({
      exerciseId,
      hintText: createHintDto.content,
      unlockAfterFailedAttempts: createHintDto.requiredFailedAttempts ?? 3,
      position: nextPosition,
    });

    return await this.hintRepository.save(hint);
  }

  async updateHint(
    hintId: string,
    updateHintDto: UpdateHintDto,
    userOrUserId: any,
  ): Promise<ExerciseHint> {
    const hint = await this.hintRepository.findOne({
      where: { id: hintId },
      relations: ['exercise', 'exercise.unit', 'exercise.unit.course'],
    });

    if (!hint) {
      throw new NotFoundException('Hint not found');
    }

    ensureOwnerOrAdmin(hint.exercise.unit.course.createdBy, userOrUserId);

    if (updateHintDto.content !== undefined) {
      hint.hintText = updateHintDto.content;
    }

    if (updateHintDto.requiredFailedAttempts !== undefined) {
      hint.unlockAfterFailedAttempts = updateHintDto.requiredFailedAttempts;
    }

    return await this.hintRepository.save(hint);
  }

  async deleteHint(hintId: string, userOrUserId: any): Promise<void> {
    const hint = await this.hintRepository.findOne({
      where: { id: hintId },
      relations: ['exercise', 'exercise.unit', 'exercise.unit.course'],
    });

    if (!hint) {
      throw new NotFoundException('Hint not found');
    }

    ensureOwnerOrAdmin(hint.exercise.unit.course.createdBy, userOrUserId);

    await this.hintRepository.remove(hint);
  }

    async getExerciseById(
        exerciseId: string,
        userOrUserId?: any,
    ): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id: exerciseId },
      relations: ['testCases', 'hints'],
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    if (userOrUserId) {
        ensureOwnerOrAdmin(
            (exercise as any).unit?.course?.createdBy,
            userOrUserId,
        );
    }

    return exercise;
  }
}
