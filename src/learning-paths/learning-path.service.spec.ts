import {BadRequestException, NotFoundException} from '@nestjs/common';
import {LearningPathService} from './learning-path.service';
import {EnrollmentStatus} from '../entities/progress/enrollment.entity';

type RepoMock = {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
};

const createRepoMock = (): RepoMock => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
});

describe('LearningPathService', () => {
    let service: LearningPathService;
    let learningPathRepository: RepoMock;
    let learningPathCourseRepository: RepoMock;
    let userPreferenceRepository: RepoMock;
    let courseRepository: RepoMock;
    let responseRepository: RepoMock;
    let enrollmentRepository: RepoMock;

    beforeEach(() => {
        learningPathRepository = createRepoMock();
        learningPathCourseRepository = createRepoMock();
        userPreferenceRepository = createRepoMock();
        courseRepository = createRepoMock();
        responseRepository = createRepoMock();
        enrollmentRepository = createRepoMock();

        service = new LearningPathService(
            learningPathRepository as any,
            learningPathCourseRepository as any,
            userPreferenceRepository as any,
            courseRepository as any,
            responseRepository as any,
            enrollmentRepository as any,
        );
    });

    it('joinPath should throw when user already has a learning path', async () => {
        learningPathRepository.findOne.mockResolvedValue({
            id: 'lp-1',
            isPublic: true,
        });
        userPreferenceRepository.findOne.mockResolvedValue({
            userId: 'user-1',
            learningPathId: 'lp-existing',
        });

        await expect(service.joinPath('user-1', 'lp-1')).rejects.toThrow(
            BadRequestException,
        );
    });

    it('leavePath should throw when user is not in any learning path', async () => {
        userPreferenceRepository.findOne.mockResolvedValue({
            userId: 'user-1',
            learningPathId: null,
        });

        await expect(service.leavePath('user-1', 'lp-1')).rejects.toThrow(
            BadRequestException,
        );
    });

    it('leavePath should throw when user is in a different learning path', async () => {
        userPreferenceRepository.findOne.mockResolvedValue({
            userId: 'user-1',
            learningPathId: 'lp-other',
        });

        await expect(service.leavePath('user-1', 'lp-1')).rejects.toThrow(
            BadRequestException,
        );
    });

    it('getUserPath should include id/title/completed plus metadata and progressPercent', async () => {
        userPreferenceRepository.findOne.mockResolvedValue({
            userId: 'user-1',
            learningPath: {
                id: 'lp-1',
                slug: 'path',
                title: 'Path',
                description: 'desc',
                criteria: {},
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                courses: [
                    {
                        courseId: 'course-1',
                        position: 1,
                        course: {
                            id: 'course-1',
                            title: 'Course 1',
                            slug: 'course-1',
                            description: 'course desc',
                            language: 'javascript',
                            level: 'beginner',
                            thumbnailS3Key: 'thumb-1',
                        },
                    },
                ],
            },
        });
        enrollmentRepository.find.mockResolvedValue([
            {
                userId: 'user-1',
                courseId: 'course-1',
                status: EnrollmentStatus.ACTIVE,
                courseProgress: {
                    progressPercent: 45.5,
                },
            },
        ]);

        const result = await service.getUserPath('user-1');
        expect(result.courses[0]).toEqual(
            expect.objectContaining({
                id: 'course-1',
                title: 'Course 1',
                completed: false,
                description: 'course desc',
                language: 'javascript',
                level: 'beginner',
                thumbnailS3Key: 'thumb-1',
                progressPercent: 45.5,
            }),
        );
    });

    it('joinPath should throw not found when learning path does not exist', async () => {
        learningPathRepository.findOne.mockResolvedValue(null);

        await expect(service.joinPath('user-1', 'lp-1')).rejects.toThrow(
            NotFoundException,
        );
    });
});
