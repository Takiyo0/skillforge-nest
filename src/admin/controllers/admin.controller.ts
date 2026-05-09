import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {multerOptions} from '../../common/upload-limits';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiBody,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiHeader,
} from '@nestjs/swagger';
import {JwtAuthGuard} from '../../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../../auth/guards/roles.guard';
import {Roles} from '../../auth/decorators/roles.decorator';
import {UserRoleEnum} from '../../entities';
import {CurrentUser} from '../../users/decorators/current-user.decorator';
import {User} from '../../entities/user.entity';
import {AdminCoursesService} from '../services/admin-courses.service';
import {AdminUnitsService} from '../services/admin-units.service';
import {AdminExercisesService} from '../services/admin-exercises.service';
import {AdminQuizzesService} from '../services/admin-quizzes.service';
import {AdminModuleContentService} from '../services/admin-module-content.service';
import {AdminFinalExamService} from '../services/admin-final-exam.service';
import {AdminBadgesService} from '../services/admin-badges.service';
import {AdminUsersService} from '../services/admin-users.service';
import {CreateCourseDto, UpdateCourseDto} from '../dto/create-course.dto';
import {
    CreateUnitDto,
    UpdateUnitDto,
    CreateUnitPrerequisiteDto,
} from '../dto/create-unit.dto';
import {
    CreateExerciseDto,
    UpdateExerciseDto,
    CreateTestCaseDto,
    UpdateTestCaseDto,
    CreateHintDto,
    UpdateHintDto,
} from '../dto/create-exercise.dto';
import {
    CreateQuizDto,
    UpdateQuizDto,
    CreateQuizQuestionDto,
    UpdateQuizQuestionDto,
    CreateQuizOptionDto,
    UpdateQuizOptionDto,
} from '../dto/create-quiz.dto';
import {
    CreateModuleContentDto,
    UpdateModuleContentDto,
} from '../dto/create-module-content.dto';
import {
    CreateModuleResourceDto,
    UpdateModuleResourceDto,
    UploadModuleResourceDto,
} from '../dto/create-module-resource.dto';
import {UpdateUserRolesDto, ListUsersQueryDto} from '../dto/manage-user.dto';
import {AdminModuleResourcesService} from '../services/admin-module-resources.service';
import {AdminMediaUploadService} from '../services/admin-media-upload.service';
import {CreateBadgeDto, UpdateBadgeDto} from '../dto/badge.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(
        private coursesService: AdminCoursesService,
        private unitsService: AdminUnitsService,
        private exercisesService: AdminExercisesService,
        private quizzesService: AdminQuizzesService,
        private moduleContentService: AdminModuleContentService,
        private finalExamService: AdminFinalExamService,
        private badgesService: AdminBadgesService,
        private usersService: AdminUsersService,
        private moduleResourcesService: AdminModuleResourcesService,
        private mediaUploadService: AdminMediaUploadService,
    ) {
    }

    // ============= COURSES =============

    @Post('courses')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Create a new course',
        description: 'Create a new course as an instructor. Only authenticated instructors with admin permissions can create courses.',
    })
    @ApiBody({
        type: CreateCourseDto,
        description: 'Course creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Course successfully created',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createCourse(
        @CurrentUser() user: User,
        @Body() createCourseDto: CreateCourseDto,
    ) {
        return this.coursesService.createCourse(user.id, createCourseDto);
    }

    @Get('courses')
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Get accessible courses',
        description:
            'Retrieve all courses for admins or only the authenticated instructor courses for instructors',
    })
    @ApiResponse({
        status: 200,
        description: 'List of accessible courses retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async getCourses(@CurrentUser() user: User) {
        const isAdmin = user.roles?.some(
            (role: any) => role === UserRoleEnum.ADMIN || role.role === UserRoleEnum.ADMIN,
        );

        if (isAdmin) {
            return this.coursesService.getAllCourses();
        }

        return this.coursesService.getInstructorCourses(user.id);
    }

    @Get('courses/:courseId')
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Get course details',
        description: 'Retrieve detailed information about a specific course',
    })
    @ApiParam({
        name: 'courseId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the course',
    })
    @ApiResponse({
        status: 200,
        description: 'Course details retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Course not found',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async getCourseById(@CurrentUser() user: User, @Param('courseId') courseId: string) {
        return this.coursesService.getCourseById(courseId, user);
    }

    @Put('courses/:courseId')
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Update course',
        description: 'Update an existing course. Only the course creator can update it.',
    })
    @ApiParam({
        name: 'courseId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the course',
    })
    @ApiBody({
        type: UpdateCourseDto,
        description: 'Course update payload',
    })
    @ApiResponse({
        status: 200,
        description: 'Course successfully updated',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to update this course',
    })
    @ApiResponse({
        status: 404,
        description: 'Course not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateCourse(
        @CurrentUser() user: User,
        @Param('courseId') courseId: string,
        @Body() updateCourseDto: UpdateCourseDto,
    ) {
        return this.coursesService.updateCourse(courseId, user, updateCourseDto);
    }

    @Delete('courses/:courseId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Delete course',
        description: 'Delete a course and all associated content. Only the course creator can delete it.',
    })
    @ApiParam({
        name: 'courseId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the course',
    })
    @ApiResponse({
        status: 204,
        description: 'Course successfully deleted',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to delete this course',
    })
    @ApiResponse({
        status: 404,
        description: 'Course not found',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteCourse(
        @CurrentUser() user: User,
        @Param('courseId') courseId: string,
    ) {
        return this.coursesService.deleteCourse(courseId, user);
    }

    @Post('courses/:courseId/publish')
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Publish course',
        description: 'Publish a course to make it visible to students. Only the course creator can publish it.',
    })
    @ApiParam({
        name: 'courseId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the course',
    })
    @ApiResponse({
        status: 200,
        description: 'Course successfully published',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to publish this course',
    })
    @ApiResponse({
        status: 404,
        description: 'Course not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Course cannot be published (missing required content)',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async publishCourse(
        @CurrentUser() user: User,
        @Param('courseId') courseId: string,
    ) {
        return this.coursesService.publishCourse(courseId, user);
    }

    @Post('courses/:courseId/unpublish')
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Unpublish course',
        description: 'Unpublish a course to hide it from students. Only the course creator can unpublish it.',
    })
    @ApiParam({
        name: 'courseId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the course',
    })
    @ApiResponse({
        status: 200,
        description: 'Course successfully unpublished',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to unpublish this course',
    })
    @ApiResponse({
        status: 404,
        description: 'Course not found',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async unpublishCourse(
        @CurrentUser() user: User,
        @Param('courseId') courseId: string,
    ) {
        return this.coursesService.unpublishCourse(courseId, user);
    }

    @Post('courses/:courseId/thumbnail/upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file', multerOptions('image')))
    @ApiTags('Admin - Courses')
    @ApiOperation({
        summary: 'Upload course thumbnail',
        description: 'Upload a thumbnail image for a course. Supported formats: JPEG, PNG. Max size: 5MB',
    })
    @ApiParam({
        name: 'courseId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the course',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Course thumbnail image file (JPEG, PNG, max 5MB)',
                },
            },
            required: ['file'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Thumbnail successfully uploaded',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file format or file size exceeds limit',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to upload thumbnail for this course',
    })
    @ApiResponse({
        status: 404,
        description: 'Course not found',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async uploadCourseThumbnail(
        @CurrentUser() user: User,
        @Param('courseId') courseId: string,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.mediaUploadService.uploadCourseThumbnail(
            courseId,
            file,
            user,
        );
    }

    // ============= UNITS =============

    @Post('courses/:courseId/units')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Units')
    @ApiOperation({
        summary: 'Create a new unit',
        description: 'Create a new unit within a course. Only the course creator can add units.',
    })
    @ApiParam({
        name: 'courseId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the course',
    })
    @ApiBody({
        type: CreateUnitDto,
        description: 'Unit creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Unit successfully created',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to add units to this course',
    })
    @ApiResponse({
        status: 404,
        description: 'Course not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createUnit(
        @CurrentUser() user: User,
        @Param('courseId') courseId: string,
        @Body() createUnitDto: CreateUnitDto,
    ) {
        return this.unitsService.createUnit(courseId, createUnitDto, user);
    }

    @Get('units/:unitId')
    @ApiTags('Admin - Units')
    @ApiOperation({
        summary: 'Get unit details',
        description: 'Retrieve detailed information about a specific unit',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiResponse({
        status: 200,
        description: 'Unit details retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async getUnitById(@CurrentUser() user: User, @Param('unitId') unitId: string) {
        return this.unitsService.getUnitById(unitId, user);
    }

    @Put('units/:unitId')
    @ApiTags('Admin - Units')
    @ApiOperation({
        summary: 'Update unit',
        description: 'Update an existing unit. Only the course creator can update units.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: UpdateUnitDto,
        description: 'Unit update payload',
    })
    @ApiResponse({
        status: 200,
        description: 'Unit successfully updated',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to update this unit',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateUnit(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() updateUnitDto: UpdateUnitDto,
    ) {
        return this.unitsService.updateUnit(unitId, updateUnitDto, user);
    }

    @Delete('units/:unitId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Units')
    @ApiOperation({
        summary: 'Delete unit',
        description: 'Delete a unit and all associated content. Only the course creator can delete units.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiResponse({
        status: 204,
        description: 'Unit successfully deleted',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to delete this unit',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteUnit(@CurrentUser() user: User, @Param('unitId') unitId: string) {
        return this.unitsService.deleteUnit(unitId, user);
    }

    @Post('units/:unitId/prerequisites')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Units')
    @ApiOperation({
        summary: 'Add prerequisite to unit',
        description: 'Add a prerequisite unit that must be completed before this unit. Only the course creator can add prerequisites.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: CreateUnitPrerequisiteDto,
        description: 'Prerequisite creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Prerequisite successfully added',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to add prerequisites to this unit',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or prerequisite unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Invalid prerequisite relationship',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async addPrerequisite(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() prerequisiteDto: CreateUnitPrerequisiteDto,
    ) {
        return this.unitsService.addPrerequisite(unitId, prerequisiteDto, user);
    }

    @Delete('units/:unitId/prerequisites/:prerequisiteUnitId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Units')
    @ApiOperation({
        summary: 'Remove prerequisite from unit',
        description: 'Remove a prerequisite requirement from a unit. Only the course creator can remove prerequisites.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiParam({
        name: 'prerequisiteUnitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the prerequisite unit to remove',
    })
    @ApiResponse({
        status: 204,
        description: 'Prerequisite successfully removed',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have permission to remove prerequisites from this unit',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or prerequisite relationship not found',
    })
    @ApiBearerAuth('access-token')
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async removePrerequisite(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Param('prerequisiteUnitId') prerequisiteUnitId: string,
    ) {
        return this.unitsService.removePrerequisite(
            unitId,
            prerequisiteUnitId,
            user,
        );
    }

    // ============= EXERCISES =============

    @Post('units/:unitId/exercises')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create exercise',
        description: 'Create a new exercise within a unit. Requires admin privileges.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        description: 'Unique identifier of the unit',
        required: true,
    })
    @ApiBody({
        type: CreateExerciseDto,
        description: 'Exercise data (title, prompt, difficulty, language, starter code, CPU/memory limits)',
    })
    @ApiResponse({
        status: 201,
        description: 'Exercise created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid exercise data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createExercise(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() createExerciseDto: CreateExerciseDto,
    ) {
        return this.exercisesService.createExercise(
            unitId,
            createExerciseDto,
            user,
        );
    }

    @Get('exercises/:exerciseId')
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get exercise details',
        description: 'Retrieve full details of a specific exercise including test cases and hints.',
    })
    @ApiParam({
        name: 'exerciseId',
        type: 'string',
        description: 'Unique identifier of the exercise',
        required: true,
    })
    @ApiResponse({
        status: 200,
        description: 'Exercise details retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Exercise not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async getExerciseById(@CurrentUser() user: User, @Param('exerciseId') exerciseId: string) {
        return this.exercisesService.getExerciseById(exerciseId, user);
    }

    @Put('exercises/:exerciseId')
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update exercise',
        description: 'Update exercise details. All fields are optional.',
    })
    @ApiParam({
        name: 'exerciseId',
        type: 'string',
        description: 'Unique identifier of the exercise to update',
        required: true,
    })
    @ApiBody({
        type: UpdateExerciseDto,
        description: 'Partial exercise data (any updatable fields)',
    })
    @ApiResponse({
        status: 200,
        description: 'Exercise updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Exercise not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid exercise data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateExercise(
        @CurrentUser() user: User,
        @Param('exerciseId') exerciseId: string,
        @Body() updateExerciseDto: UpdateExerciseDto,
    ) {
        return this.exercisesService.updateExercise(
            exerciseId,
            updateExerciseDto,
            user,
        );
    }

    @Delete('exercises/:exerciseId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete exercise',
        description: 'Permanently delete an exercise. Also deletes all associated test cases and hints.',
    })
    @ApiParam({
        name: 'exerciseId',
        type: 'string',
        description: 'Unique identifier of the exercise to delete',
        required: true,
    })
    @ApiResponse({
        status: 204,
        description: 'Exercise deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Exercise not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteExercise(
        @CurrentUser() user: User,
        @Param('exerciseId') exerciseId: string,
    ) {
        return this.exercisesService.deleteExercise(exerciseId, user);
    }

    // ============= TEST CASES =============

    @Post('exercises/:exerciseId/test-cases')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Add test case',
        description: 'Add a new test case to an exercise. Test cases are used to validate student solutions.',
    })
    @ApiParam({
        name: 'exerciseId',
        type: 'string',
        description: 'Unique identifier of the parent exercise',
        required: true,
    })
    @ApiBody({
        type: CreateTestCaseDto,
        description: 'Test case data (input text, expected output, optional description)',
    })
    @ApiResponse({
        status: 201,
        description: 'Test case added successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Exercise not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid test case data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async addTestCase(
        @CurrentUser() user: User,
        @Param('exerciseId') exerciseId: string,
        @Body() createTestCaseDto: CreateTestCaseDto,
    ) {
        return this.exercisesService.addTestCase(
            exerciseId,
            createTestCaseDto,
            user,
        );
    }

    @Put('test-cases/:testCaseId')
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update test case',
        description: 'Update test case details. All fields are optional.',
    })
    @ApiParam({
        name: 'testCaseId',
        type: 'string',
        description: 'Unique identifier of the test case to update',
        required: true,
    })
    @ApiBody({
        type: UpdateTestCaseDto,
        description: 'Partial test case data (input, expected output, or description)',
    })
    @ApiResponse({
        status: 200,
        description: 'Test case updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Test case not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid test case data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateTestCase(
        @CurrentUser() user: User,
        @Param('testCaseId') testCaseId: string,
        @Body() updateTestCaseDto: UpdateTestCaseDto,
    ) {
        return this.exercisesService.updateTestCase(
            testCaseId,
            updateTestCaseDto,
            user,
        );
    }

    @Delete('test-cases/:testCaseId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete test case',
        description: 'Permanently delete a test case from an exercise.',
    })
    @ApiParam({
        name: 'testCaseId',
        type: 'string',
        description: 'Unique identifier of the test case to delete',
        required: true,
    })
    @ApiResponse({
        status: 204,
        description: 'Test case deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Test case not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteTestCase(
        @CurrentUser() user: User,
        @Param('testCaseId') testCaseId: string,
    ) {
        return this.exercisesService.deleteTestCase(testCaseId, user);
    }

    // ============= HINTS =============

    @Post('exercises/:exerciseId/hints')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Add hint',
        description: 'Add a new hint to an exercise. Hints are unlocked after failed attempts.',
    })
    @ApiParam({
        name: 'exerciseId',
        type: 'string',
        description: 'Unique identifier of the parent exercise',
        required: true,
    })
    @ApiBody({
        type: CreateHintDto,
        description: 'Hint data (content 10-1000 chars, required failed attempts to unlock)',
    })
    @ApiResponse({
        status: 201,
        description: 'Hint added successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Exercise not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid hint data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async addHint(
        @CurrentUser() user: User,
        @Param('exerciseId') exerciseId: string,
        @Body() createHintDto: CreateHintDto,
    ) {
        return this.exercisesService.addHint(exerciseId, createHintDto, user);
    }

    @Put('hints/:hintId')
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update hint',
        description: 'Update hint details. All fields are optional.',
    })
    @ApiParam({
        name: 'hintId',
        type: 'string',
        description: 'Unique identifier of the hint to update',
        required: true,
    })
    @ApiBody({
        type: UpdateHintDto,
        description: 'Partial hint data (content or required failed attempts)',
    })
    @ApiResponse({
        status: 200,
        description: 'Hint updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Hint not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid hint data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateHint(
        @CurrentUser() user: User,
        @Param('hintId') hintId: string,
        @Body() updateHintDto: UpdateHintDto,
    ) {
        return this.exercisesService.updateHint(hintId, updateHintDto, user);
    }

    @Delete('hints/:hintId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Exercises')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete hint',
        description: 'Permanently delete a hint from an exercise.',
    })
    @ApiParam({
        name: 'hintId',
        type: 'string',
        description: 'Unique identifier of the hint to delete',
        required: true,
    })
    @ApiResponse({
        status: 204,
        description: 'Hint deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Hint not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteHint(@CurrentUser() user: User, @Param('hintId') hintId: string) {
        return this.exercisesService.deleteHint(hintId, user);
    }

    // ============= QUIZZES =============

    @Post('units/:unitId/quizzes')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create quiz',
        description: 'Create a new quiz within a unit. Requires admin privileges.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        description: 'Unique identifier of the unit',
        required: true,
    })
    @ApiBody({
        type: CreateQuizDto,
        description: 'Quiz data (title, instructions, passing score, time limit, randomize options)',
    })
    @ApiResponse({
        status: 201,
        description: 'Quiz created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid quiz data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createQuiz(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() createQuizDto: CreateQuizDto,
    ) {
        return this.quizzesService.createQuiz(unitId, createQuizDto, user);
    }

    @Get('quizzes/:quizId')
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get quiz details',
        description: 'Retrieve full details of a specific quiz including all questions and options.',
    })
    @ApiParam({
        name: 'quizId',
        type: 'string',
        description: 'Unique identifier of the quiz',
        required: true,
    })
    @ApiResponse({
        status: 200,
        description: 'Quiz details retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Quiz not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async getQuizById(@CurrentUser() user: User, @Param('quizId') quizId: string) {
        return this.quizzesService.getQuizById(quizId, user);
    }

    @Put('quizzes/:quizId')
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update quiz',
        description: 'Update quiz details. All fields are optional.',
    })
    @ApiParam({
        name: 'quizId',
        type: 'string',
        description: 'Unique identifier of the quiz to update',
        required: true,
    })
    @ApiBody({
        type: UpdateQuizDto,
        description: 'Partial quiz data (title, instructions, passing score, time limit, etc)',
    })
    @ApiResponse({
        status: 200,
        description: 'Quiz updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Quiz not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid quiz data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateQuiz(
        @CurrentUser() user: User,
        @Param('quizId') quizId: string,
        @Body() updateQuizDto: UpdateQuizDto,
    ) {
        return this.quizzesService.updateQuiz(quizId, updateQuizDto, user);
    }

    @Delete('quizzes/:quizId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete quiz',
        description: 'Permanently delete a quiz. Also deletes all associated questions and options.',
    })
    @ApiParam({
        name: 'quizId',
        type: 'string',
        description: 'Unique identifier of the quiz to delete',
        required: true,
    })
    @ApiResponse({
        status: 204,
        description: 'Quiz deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Quiz not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteQuiz(@CurrentUser() user: User, @Param('quizId') quizId: string) {
        return this.quizzesService.deleteQuiz(quizId, user);
    }

    // ============= QUIZ QUESTIONS =============

    @Post('quizzes/:quizId/questions')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Add question',
        description: 'Add a new question to a quiz. Question must include prompt and at least one option.',
    })
    @ApiParam({
        name: 'quizId',
        type: 'string',
        description: 'Unique identifier of the parent quiz',
        required: true,
    })
    @ApiBody({
        type: CreateQuizQuestionDto,
        description: 'Question data (prompt 5-2000 chars, points 1-100, explanation, options array)',
    })
    @ApiResponse({
        status: 201,
        description: 'Question added successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Quiz not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid question data (e.g., no options)',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async addQuizQuestion(
        @CurrentUser() user: User,
        @Param('quizId') quizId: string,
        @Body() createQuestionDto: CreateQuizQuestionDto,
    ) {
        return this.quizzesService.addQuestion(quizId, createQuestionDto, user);
    }

    @Put('questions/:questionId')
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update question',
        description: 'Update question details. All fields are optional.',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        description: 'Unique identifier of the question to update',
        required: true,
    })
    @ApiBody({
        type: UpdateQuizQuestionDto,
        description: 'Partial question data (prompt, points, or explanation)',
    })
    @ApiResponse({
        status: 200,
        description: 'Question updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Question not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid question data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateQuizQuestion(
        @CurrentUser() user: User,
        @Param('questionId') questionId: string,
        @Body() updateQuestionDto: UpdateQuizQuestionDto,
    ) {
        return this.quizzesService.updateQuestion(
            questionId,
            updateQuestionDto,
            user,
        );
    }

    @Delete('questions/:questionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete question',
        description: 'Permanently delete a question from a quiz. Also deletes all associated options.',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        description: 'Unique identifier of the question to delete',
        required: true,
    })
    @ApiResponse({
        status: 204,
        description: 'Question deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Question not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteQuizQuestion(
        @CurrentUser() user: User,
        @Param('questionId') questionId: string,
    ) {
        return this.quizzesService.deleteQuestion(questionId, user);
    }

    // ============= QUIZ OPTIONS =============

    @Post('questions/:questionId/options')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create option',
        description: 'Create a new answer option for a quiz question.',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        description: 'Unique identifier of the question',
        required: true,
    })
    @ApiBody({
        type: CreateQuizOptionDto,
        description: 'Option data (label, isCorrect, optional position)',
    })
    @ApiResponse({
        status: 201,
        description: 'Option created successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Question not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid option data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createQuizOption(
        @CurrentUser() user: User,
        @Param('questionId') questionId: string,
        @Body() createOptionDto: CreateQuizOptionDto,
    ) {
        return this.quizzesService.addOption(questionId, createOptionDto, user);
    }

    @Put('options/:optionId')
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update option',
        description: 'Update option details within a quiz question. All fields are optional.',
    })
    @ApiParam({
        name: 'optionId',
        type: 'string',
        description: 'Unique identifier of the option to update',
        required: true,
    })
    @ApiBody({
        type: UpdateQuizOptionDto,
        description: 'Partial option data (label 1-500 chars, isCorrect boolean, position)',
    })
    @ApiResponse({
        status: 200,
        description: 'Option updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Option not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable entity - Invalid option data',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateQuizOption(
        @CurrentUser() user: User,
        @Param('optionId') optionId: string,
        @Body() updateOptionDto: UpdateQuizOptionDto,
    ) {
        return this.quizzesService.updateOption(optionId, updateOptionDto, user);
    }

    @Delete('options/:optionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Quizzes')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete option',
        description: 'Permanently delete an option from a quiz question.',
    })
    @ApiParam({
        name: 'optionId',
        type: 'string',
        description: 'Unique identifier of the option to delete',
        required: true,
    })
    @ApiResponse({
        status: 204,
        description: 'Option deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Missing or invalid JWT token',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin privileges',
    })
    @ApiResponse({
        status: 404,
        description: 'Option not found',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteQuizOption(
        @CurrentUser() user: User,
        @Param('optionId') optionId: string,
    ) {
        return this.quizzesService.deleteOption(optionId, user);
    }

    // ============= MODULE CONTENT =============

    @Post('units/:unitId/content')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create module content',
        description: 'Create a new module content resource for a unit. Instructors can add learning material to units.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: CreateModuleContentDto,
        description: 'Module content creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Module content successfully created',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createModuleContent(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() createModuleContentDto: CreateModuleContentDto,
    ) {
        return this.moduleContentService.createModuleContent(
            unitId,
            createModuleContentDto,
            user,
        );
    }

    @Get('units/:unitId/content')
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get module content',
        description: 'Retrieve module content for a specific unit',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiResponse({
        status: 200,
        description: 'Module content retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or content not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async getModuleContent(@CurrentUser() user: User, @Param('unitId') unitId: string) {
        return this.moduleContentService.getModuleContentByUnit(unitId, user);
    }

    @Put('units/:unitId/content')
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update module content',
        description: 'Update existing module content for a unit',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: UpdateModuleContentDto,
        description: 'Module content update payload',
    })
    @ApiResponse({
        status: 200,
        description: 'Module content successfully updated',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or content not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateModuleContent(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() updateModuleContentDto: UpdateModuleContentDto,
    ) {
        return this.moduleContentService.updateModuleContent(
            unitId,
            updateModuleContentDto,
            user,
        );
    }

    @Delete('units/:unitId/content')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete module content',
        description: 'Permanently delete module content from a unit',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiResponse({
        status: 204,
        description: 'Module content successfully deleted',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or content not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteModuleContent(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
    ) {
        return this.moduleContentService.deleteModuleContent(unitId, user);
    }

    @Get('units/:unitId/resources')
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'List module resources',
        description: 'Retrieve all resources associated with a unit',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiResponse({
        status: 200,
        description: 'Resources list retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async listModuleResources(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
    ) {
        return this.moduleResourcesService.listByUnit(unitId, user);
    }

    @Post('units/:unitId/resources')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create module resource',
        description: 'Create a new resource for a unit (e.g., PDF, document, link)',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: CreateModuleResourceDto,
        description: 'Resource creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Resource successfully created',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createModuleResource(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() createDto: CreateModuleResourceDto,
    ) {
        return this.moduleResourcesService.create(unitId, createDto, user);
    }

    @Put('module-resources/:resourceId')
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update module resource',
        description: 'Update an existing module resource',
    })
    @ApiParam({
        name: 'resourceId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the resource',
    })
    @ApiBody({
        type: UpdateModuleResourceDto,
        description: 'Resource update payload',
    })
    @ApiResponse({
        status: 200,
        description: 'Resource successfully updated',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Resource not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateModuleResource(
        @CurrentUser() user: User,
        @Param('resourceId') resourceId: string,
        @Body() updateDto: UpdateModuleResourceDto,
    ) {
        return this.moduleResourcesService.update(resourceId, updateDto, user);
    }

    @Delete('module-resources/:resourceId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete module resource',
        description: 'Permanently delete a module resource',
    })
    @ApiParam({
        name: 'resourceId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the resource',
    })
    @ApiResponse({
        status: 204,
        description: 'Resource successfully deleted',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Resource not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteModuleResource(
        @CurrentUser() user: User,
        @Param('resourceId') resourceId: string,
    ) {
        return this.moduleResourcesService.delete(resourceId, user);
    }

    @Post('units/:unitId/content/video/upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file', multerOptions('video')))
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Upload module video',
        description: 'Upload a video file for module content. Supported formats: MP4, WebM. Max size: 500MB.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Video file (MP4, WebM format, max 500MB)',
                },
            },
            required: ['file'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Video successfully uploaded',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file format or size exceeds limit',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - File upload validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async uploadModuleVideo(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.mediaUploadService.uploadModuleVideo(unitId, file, user);
    }

    @Post('units/:unitId/resources/upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file', multerOptions('file')))
    @ApiTags('Admin - Content')
    @ApiBearerAuth('access-token')
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Upload resource file',
        description: 'Upload a resource file (PDF, DOC, etc.) for a unit. Supported formats: PDF, DOCX, XLSX, PPTX. Max size: 100MB.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Resource file (PDF, DOCX, XLSX, PPTX format, max 100MB)',
                },
                label: {
                    type: 'string',
                    description: 'Display label for the resource',
                },
                resourceType: {
                    type: 'string',
                    enum: ['document', 'spreadsheet', 'presentation', 'other'],
                    description: 'Type of resource being uploaded',
                },
            },
            required: ['file', 'label', 'resourceType'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Resource file successfully uploaded',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file format or size exceeds limit',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - File upload validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async uploadModuleResource(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() uploadDto: UploadModuleResourceDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.mediaUploadService.uploadModuleResource(
            unitId,
            file,
            user,
            uploadDto.label,
            uploadDto.resourceType,
        );
    }

    // ============= FINAL EXAMS =============

    @Post('units/:unitId/final-exam/questions')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create final exam question',
        description: 'Create a new question for a final exam. Questions support multiple choice format.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: CreateQuizQuestionDto,
        description: 'Final exam question creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Question successfully created',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createFinalExamQuestion(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() createQuestionDto: CreateQuizQuestionDto,
    ) {
        return this.finalExamService.createFinalExamQuestion(
            unitId,
            createQuestionDto,
            user,
        );
    }

    @Put('units/:unitId/final-exam/questions/:questionId')
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update final exam question',
        description: 'Update an existing final exam question',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the question',
    })
    @ApiBody({
        type: UpdateQuizQuestionDto,
        description: 'Final exam question update payload',
    })
    @ApiResponse({
        status: 200,
        description: 'Question successfully updated',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or question not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateFinalExamQuestion(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Param('questionId') questionId: string,
        @Body() updateQuestionDto: UpdateQuizQuestionDto,
    ) {
        return this.finalExamService.updateFinalExamQuestion(
            unitId,
            questionId,
            updateQuestionDto,
            user,
        );
    }

    @Delete('units/:unitId/final-exam/questions/:questionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete final exam question',
        description: 'Permanently delete a final exam question. Also deletes all associated options.',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the question',
    })
    @ApiResponse({
        status: 204,
        description: 'Question successfully deleted',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or question not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteFinalExamQuestion(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Param('questionId') questionId: string,
    ) {
        return this.finalExamService.deleteFinalExamQuestion(
            unitId,
            questionId,
            user.id,
        );
    }

    @Post('units/:unitId/final-exam/questions/:questionId/options')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Add final exam question option',
        description: 'Create a new answer option for a final exam question',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the question',
    })
    @ApiBody({
        type: CreateQuizOptionDto,
        description: 'Question option creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Option successfully created',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or question not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createFinalExamQuestionOption(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Param('questionId') questionId: string,
        @Body() createOptionDto: CreateQuizOptionDto,
    ) {
        return this.finalExamService.createFinalExamQuestionOption(
            unitId,
            questionId,
            createOptionDto,
            user,
        );
    }

    @Put('units/:unitId/final-exam/questions/:questionId/options/:optionId')
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update final exam question option',
        description: 'Update an existing answer option for a final exam question',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the question',
    })
    @ApiParam({
        name: 'optionId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the option',
    })
    @ApiBody({
        type: UpdateQuizOptionDto,
        description: 'Question option update payload',
    })
    @ApiResponse({
        status: 200,
        description: 'Option successfully updated',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit, question, or option not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateFinalExamQuestionOption(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Param('questionId') questionId: string,
        @Param('optionId') optionId: string,
        @Body() updateOptionDto: UpdateQuizOptionDto,
    ) {
        return this.finalExamService.updateFinalExamQuestionOption(
            unitId,
            questionId,
            optionId,
            updateOptionDto,
            user,
        );
    }

    @Delete('units/:unitId/final-exam/questions/:questionId/options/:optionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete final exam question option',
        description: 'Permanently delete an answer option from a final exam question',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiParam({
        name: 'questionId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the question',
    })
    @ApiParam({
        name: 'optionId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the option',
    })
    @ApiResponse({
        status: 204,
        description: 'Option successfully deleted',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit, question, or option not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteFinalExamQuestionOption(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Param('questionId') questionId: string,
        @Param('optionId') optionId: string,
    ) {
        return this.finalExamService.deleteFinalExamQuestionOption(
            unitId,
            questionId,
            optionId,
            user,
        );
    }

    @Post('units/:unitId/final-exam/exercises')
    @HttpCode(HttpStatus.CREATED)
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Add exercise to final exam',
        description: 'Add a coding exercise to the final exam for a unit',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: CreateExerciseDto,
        description: 'Exercise creation payload',
    })
    @ApiResponse({
        status: 201,
        description: 'Exercise successfully added to final exam',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async createFinalExamExercise(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() createExerciseDto: CreateExerciseDto,
    ) {
        return this.finalExamService.createFinalExamExercise(
            unitId,
            createExerciseDto,
            user,
        );
    }

    @Put('units/:unitId/final-exam/exercises')
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update exercise in final exam',
        description: 'Update a coding exercise that is part of a final exam',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiBody({
        type: UpdateExerciseDto,
        description: 'Exercise update payload',
    })
    @ApiResponse({
        status: 200,
        description: 'Exercise successfully updated in final exam',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid request body or validation error',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit or exercise not found',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async updateFinalExamExercise(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
        @Body() updateExerciseDto: UpdateExerciseDto,
    ) {
        return this.finalExamService.updateFinalExamExercise(
            unitId,
            updateExerciseDto,
            user,
        );
    }

    @Delete('units/:unitId/final-exam/exercises')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Final Exams')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Remove exercise from final exam',
        description: 'Permanently remove a coding exercise from the final exam',
    })
    @ApiParam({
        name: 'unitId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the unit',
    })
    @ApiResponse({
        status: 204,
        description: 'Exercise successfully removed from final exam',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Unit not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.INSTRUCTOR, UserRoleEnum.ADMIN)
    async deleteFinalExamExercise(
        @CurrentUser() user: User,
        @Param('unitId') unitId: string,
    ) {
        return this.finalExamService.deleteFinalExamExercise(unitId, user);
    }

    // ============= BADGES =============

    @Get('badges')
    @ApiTags('Admin - Other')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get all badges',
        description: 'Retrieve all available badges in the system. Requires admin authentication.',
    })
    @ApiResponse({
        status: 200,
        description: 'List of all badges retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @Roles(UserRoleEnum.ADMIN)
    async getAllBadges() {
        return this.badgesService.getAllBadges();
    }

    @Get('badges/criteria')
    @ApiTags('Admin - Other')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get badge criteria metadata',
        description:
            'Returns the supported badge criteria types and the values the admin UI can use to build structured forms.',
    })
    @ApiResponse({
        status: 200,
        description: 'Badge criteria metadata retrieved successfully',
    })
    @Roles(UserRoleEnum.ADMIN)
    async getBadgeCriteriaMetadata() {
        return this.badgesService.getBadgeCriteriaMetadata();
    }

    @Get('badges/:badgeId')
    @ApiTags('Admin - Other')
    @ApiBearerAuth('access-token')
    @ApiParam({
        name: 'badgeId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the badge',
    })
    @ApiOperation({
        summary: 'Get badge details',
        description: 'Retrieve details for a single badge.',
    })
    @ApiResponse({
        status: 200,
        description: 'Badge details retrieved successfully',
    })
    @Roles(UserRoleEnum.ADMIN)
    async getBadgeById(@Param('badgeId') badgeId: string) {
        return this.badgesService.getBadgeById(badgeId);
    }

    @Post('badges')
    @ApiTags('Admin - Other')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create badge',
        description:
            'Create a new badge using structured criteria fields only.',
    })
    @ApiBody({type: CreateBadgeDto})
    @ApiResponse({
        status: 201,
        description: 'Badge created successfully',
    })
    @Roles(UserRoleEnum.ADMIN)
    async createBadge(@Body() dto: CreateBadgeDto) {
        return this.badgesService.createBadge(dto);
    }

    @Put('badges/:badgeId')
    @ApiTags('Admin - Other')
    @ApiBearerAuth('access-token')
    @ApiParam({
        name: 'badgeId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the badge',
    })
    @ApiOperation({
        summary: 'Update badge',
        description:
            'Update a badge and its structured criteria fields.',
    })
    @ApiBody({type: UpdateBadgeDto})
    @ApiResponse({
        status: 200,
        description: 'Badge updated successfully',
    })
    @Roles(UserRoleEnum.ADMIN)
    async updateBadge(
        @Param('badgeId') badgeId: string,
        @Body() dto: UpdateBadgeDto,
    ) {
        return this.badgesService.updateBadge(badgeId, dto);
    }

    @Delete('badges/:badgeId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Other')
    @ApiBearerAuth('access-token')
    @ApiParam({
        name: 'badgeId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the badge',
    })
    @ApiOperation({
        summary: 'Delete badge',
        description: 'Delete a badge definition.',
    })
    @ApiResponse({
        status: 204,
        description: 'Badge deleted successfully',
    })
    @Roles(UserRoleEnum.ADMIN)
    async deleteBadge(@Param('badgeId') badgeId: string) {
        await this.badgesService.deleteBadge(badgeId);
    }

    @Post('badges/:badgeId/icon/upload')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file', multerOptions('image')))
    @ApiTags('Admin - Other')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Upload badge icon',
        description: 'Upload an icon image for a badge. Supported formats: JPEG, PNG. Optional - if not provided, badge will display emoji.',
    })
    @ApiParam({
        name: 'badgeId',
        type: 'string',
        required: true,
        description: 'The unique identifier of the badge',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Badge icon image file (JPEG, PNG, max 5MB)',
                },
            },
            required: ['file'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Badge icon successfully uploaded',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file format or file size exceeds limit',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - JWT token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Badge not found',
    })
    @ApiHeader({
        name: 'Authorization',
        required: true,
        description: 'Bearer JWT token',
    })
    @Roles(UserRoleEnum.ADMIN)
    async uploadBadgeIcon(
        @Param('badgeId') badgeId: string,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        return this.mediaUploadService.uploadBadgeIcon(badgeId, file);
    }

    // ============= USER MANAGEMENT =============

    @Get('users')
    @ApiTags('Admin - Users')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'List users with filters',
        description:
            'Retrieve a paginated list of users with optional filtering by search term, role, and status. Requires admin authentication.',
    })
    @ApiQuery({
        name: 'search',
        description: 'Search term for user name or email',
        required: false,
        type: String,
    })
    @ApiQuery({
        name: 'role',
        description: 'Filter by user role',
        required: false,
        type: String,
    })
    @ApiQuery({
        name: 'status',
        description: 'Filter by user status (active or inactive)',
        required: false,
        enum: ['active', 'inactive'],
    })
    @ApiQuery({
        name: 'page',
        description: 'Page number for pagination',
        required: false,
        type: Number,
    })
    @ApiQuery({
        name: 'limit',
        description: 'Results per page for pagination',
        required: false,
        type: Number,
    })
    @ApiResponse({
        status: 200,
        description: 'List of users retrieved successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid query parameters',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Query parameter validation failed',
    })
    @Roles(UserRoleEnum.ADMIN)
    async listUsers(@Query() query: ListUsersQueryDto) {
        return this.usersService.listUsers(query);
    }

    @Get('users/stats')
    @ApiTags('Admin - Users')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get user statistics',
        description:
            'Retrieve aggregated statistics about users in the system. Requires admin authentication.',
    })
    @ApiResponse({
        status: 200,
        description: 'User statistics retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @Roles(UserRoleEnum.ADMIN)
    async getUserStats() {
        return this.usersService.getUserStats();
    }

    @Get('users/:userId')
    @ApiTags('Admin - Users')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Get user details',
        description:
            'Retrieve detailed information about a specific user by ID. Requires admin authentication.',
    })
    @ApiParam({
        name: 'userId',
        description: 'The unique identifier of the user',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'User details retrieved successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - User with specified ID does not exist',
    })
    @Roles(UserRoleEnum.ADMIN)
    async getUserById(@Param('userId') userId: string) {
        return this.usersService.getUserById(userId);
    }

    @Put('users/:userId/roles')
    @ApiTags('Admin - Users')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update user roles',
        description:
            'Assign new roles to a user. Replaces existing roles with the provided ones. Requires admin authentication.',
    })
    @ApiParam({
        name: 'userId',
        description: 'The unique identifier of the user to update',
        type: String,
    })
    @ApiBody({
        description: 'Object containing new roles to assign to user',
        type: UpdateUserRolesDto,
    })
    @ApiResponse({
        status: 200,
        description: 'User roles updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid role values or missing required fields',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - User with specified ID does not exist',
    })
    @ApiResponse({
        status: 422,
        description: 'Unprocessable Entity - Validation failed',
    })
    @Roles(UserRoleEnum.ADMIN)
    async updateUserRoles(
        @Param('userId') userId: string,
        @Body() updateRolesDto: UpdateUserRolesDto,
    ) {
        return this.usersService.updateUserRoles(userId, updateRolesDto);
    }

    @Post('users/:userId/activate')
    @HttpCode(HttpStatus.OK)
    @ApiTags('Admin - Users')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Activate user',
        description:
            'Activate a deactivated user account, restoring access to the platform. Requires admin authentication.',
    })
    @ApiParam({
        name: 'userId',
        description: 'The unique identifier of the user to activate',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'User activated successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - User with specified ID does not exist',
    })
    @Roles(UserRoleEnum.ADMIN)
    async activateUser(@Param('userId') userId: string) {
        return this.usersService.activateUser(userId);
    }

    @Post('users/:userId/deactivate')
    @HttpCode(HttpStatus.OK)
    @ApiTags('Admin - Users')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Deactivate user',
        description:
            'Deactivate a user account, preventing access to the platform. Requires admin authentication.',
    })
    @ApiParam({
        name: 'userId',
        description: 'The unique identifier of the user to deactivate',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'User deactivated successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - User with specified ID does not exist',
    })
    @Roles(UserRoleEnum.ADMIN)
    async deactivateUser(@Param('userId') userId: string) {
        return this.usersService.deactivateUser(userId);
    }

    @Delete('users/:userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiTags('Admin - Users')
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Delete user',
        description:
            'Permanently delete a user account and associated data. This action cannot be undone. Requires admin authentication.',
    })
    @ApiParam({
        name: 'userId',
        description: 'The unique identifier of the user to delete',
        type: String,
    })
    @ApiResponse({
        status: 204,
        description: 'User deleted successfully',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication token is missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - User does not have admin permissions',
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - User with specified ID does not exist',
    })
    @Roles(UserRoleEnum.ADMIN)
    async deleteUser(@Param('userId') userId: string) {
        return this.usersService.deleteUser(userId);
    }
}
