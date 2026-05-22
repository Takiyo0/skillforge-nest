import {NotFoundException} from '@nestjs/common';
import {AdminCoursesService} from './admin-courses.service';

type UnitStub = {
    id: string;
    title: string;
    type: string;
    position: number;
    isPublished: boolean;
    prerequisites: unknown[];
    requiredFor: unknown[];
};

type CourseStub = {
    id: string;
    createdBy?: string;
    units: UnitStub[];
    creator?: {
        id: string;
        email?: string;
        displayName: string;
    } | null;
};

type RepoMock = {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    remove: jest.Mock;
};

const createRepoMock = (): RepoMock => ({
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
});

const getUnitPositions = (course: CourseStub): number[] =>
    course.units.map((unit) => unit.position);

describe('AdminCoursesService', () => {
    let service: AdminCoursesService;
    let courseRepository: RepoMock;

    const unsortedUnits = [
        {
            id: 'unit-2',
            title: 'Second',
            type: 'module',
            position: 2,
            isPublished: false,
            prerequisites: [],
            requiredFor: [],
        },
        {
            id: 'unit-1',
            title: 'First',
            type: 'exercise',
            position: 1,
            isPublished: false,
            prerequisites: [],
            requiredFor: [],
        },
        {
            id: 'unit-3',
            title: 'Third',
            type: 'module',
            position: 3,
            isPublished: false,
            prerequisites: [],
            requiredFor: [],
        },
    ];

    beforeEach(() => {
        courseRepository = createRepoMock();
        service = new AdminCoursesService(courseRepository as never);
    });

    it('sorts units by ascending position in getCourseById', async () => {
        courseRepository.findOne.mockResolvedValue({
            id: 'course-1',
            createdBy: 'user-1',
            units: unsortedUnits,
            creator: {
                id: 'creator-1',
                email: 'creator@example.com',
                displayName: 'Creator',
            },
        });

        const result = (await service.getCourseById('course-1')) as CourseStub;

        expect(getUnitPositions(result)).toEqual([1, 2, 3]);
        expect(result.creator.email).toBeUndefined();
    });

    it('sorts units by ascending position in getInstructorCourses', async () => {
        courseRepository.find.mockResolvedValue([
            {
                id: 'course-1',
                units: unsortedUnits,
                creator: {
                    id: 'creator-1',
                    email: 'creator@example.com',
                    displayName: 'Creator',
                },
            },
        ]);

        const result = (await service.getInstructorCourses(
            'user-1',
        )) as CourseStub[];

        expect(getUnitPositions(result[0])).toEqual([1, 2, 3]);
        expect(result[0].creator.email).toBeUndefined();
    });

    it('sorts units by ascending position in getAllCourses', async () => {
        courseRepository.find.mockResolvedValue([
            {
                id: 'course-1',
                units: unsortedUnits,
                creator: {
                    id: 'creator-1',
                    email: 'creator@example.com',
                    displayName: 'Creator',
                },
            },
        ]);

        const result = (await service.getAllCourses()) as CourseStub[];

        expect(getUnitPositions(result[0])).toEqual([1, 2, 3]);
        expect(result[0].creator.email).toBe('creator@example.com');
    });

    it('returns creator email to admins only in getCourseById', async () => {
        courseRepository.findOne.mockResolvedValue({
            id: 'course-1',
            createdBy: 'user-1',
            units: unsortedUnits,
            creator: {
                id: 'creator-1',
                email: 'creator@example.com',
                displayName: 'Creator',
            },
        });

        const adminResult = (await service.getCourseById('course-1', {
            id: 'admin-1',
            roles: ['admin'],
        })) as CourseStub;
        const instructorResult = (await service.getCourseById('course-1', {
            id: 'user-1',
            roles: ['instructor'],
        })) as CourseStub;

        expect(adminResult.creator.email).toBe('creator@example.com');
        expect(instructorResult.creator.email).toBeUndefined();
    });

    it('throws NotFoundException when course does not exist', async () => {
        courseRepository.findOne.mockResolvedValue(null);

        await expect(service.getCourseById('missing-course')).rejects.toThrow(
            NotFoundException,
        );
    });
});
