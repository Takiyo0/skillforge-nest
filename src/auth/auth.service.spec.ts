import {ConflictException, UnauthorizedException} from '@nestjs/common';
import {AuthService} from './auth.service';
import {UserRoleEnum} from '../entities/user-role.entity';

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
    compare: jest.fn().mockResolvedValue(true),
}));

type RepoMock = {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
};

const createRepoMock = (): RepoMock => ({
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
});

describe('AuthService', () => {
    let service: AuthService;
    let userRepository: RepoMock;
    let userRoleRepository: RepoMock;
    let userPreferenceRepository: RepoMock;
    let jwtService: { sign: jest.Mock };

    beforeEach(() => {
        userRepository = createRepoMock();
        userRoleRepository = createRepoMock();
        userPreferenceRepository = createRepoMock();
        jwtService = {sign: jest.fn().mockReturnValue('token')};

        service = new AuthService(
            userRepository as any,
            userRoleRepository as any,
            userPreferenceRepository as any,
            jwtService as any,
        );
    });

    it('register returns user payload without email', async () => {
        userRepository.findOne.mockResolvedValue(null);
        userRepository.create.mockImplementation((payload) => payload);
        userRepository.save.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            displayName: 'User',
        });
        userRoleRepository.create.mockImplementation((payload) => payload);
        userRoleRepository.save.mockResolvedValue({});
        userPreferenceRepository.create.mockImplementation((payload) => payload);
        userPreferenceRepository.save.mockResolvedValue({});

        const result = await service.register({
            email: 'user@example.com',
            password: 'StrongPass123!',
            displayName: 'User',
        });

        expect(result.user).toEqual({
            id: 'user-1',
            displayName: 'User',
            roles: [UserRoleEnum.LEARNER],
        });
        expect(result.user).not.toHaveProperty('email');
    });

    it('login returns user payload without email', async () => {
        const qb = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                displayName: 'User',
                isActive: true,
                passwordHash: '$2b$10$J8GvwcyMK3AKKSGQhX4SYeTwMoMs8S8jJ8wV5Y4ZcG6hK6Tm.6WOe',
                roles: [{role: UserRoleEnum.LEARNER}],
            }),
        };
        userRepository.createQueryBuilder.mockReturnValue(qb);
        userRepository.save.mockResolvedValue({});

        const result = await service.login({
            email: 'user@example.com',
            password: 'password',
        });

        expect(result.user).toEqual({
            id: 'user-1',
            displayName: 'User',
            roles: [UserRoleEnum.LEARNER],
        });
        expect(result.user).not.toHaveProperty('email');
    });

    it('throws conflict on duplicate registration', async () => {
        userRepository.findOne.mockResolvedValue({id: 'existing'});

        await expect(
            service.register({
                email: 'taken@example.com',
                password: 'StrongPass123!',
                displayName: 'Taken',
            }),
        ).rejects.toThrow(ConflictException);
    });

    it('throws unauthorized on invalid credentials', async () => {
        const qb = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
        };
        userRepository.createQueryBuilder.mockReturnValue(qb);

        await expect(
            service.login({
                email: 'missing@example.com',
                password: 'invalid',
            }),
        ).rejects.toThrow(UnauthorizedException);
    });
});
