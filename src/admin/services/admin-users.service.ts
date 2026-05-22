import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import {UserRole} from '../../entities/user-role.entity';
import { UpdateUserRolesDto, ListUsersQueryDto } from '../dto/manage-user.dto';
import {mapToInternalException} from '../../common/runtime-exception.helper';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async listUsers(queryDto: ListUsersQueryDto) {
    const page = parseInt(queryDto.page || '1', 10);
    const limit = parseInt(queryDto.limit || '20', 10);
    const skip = (page - 1) * limit;

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .orderBy('user.createdAt', 'DESC');

    if (queryDto.search) {
      query = query.where(
        '(user.email ILIKE :search OR user.displayName ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.role) {
      query = query.andWhere('roles.role = :role', { role: queryDto.role });
    }

    if (queryDto.status) {
      const isActive = queryDto.status === 'active';
      query = query.andWhere('user.isActive = :isActive', { isActive });
    }

    const [users, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarS3Key: user.avatarS3Key,
        roles: user.roles.map((r) => r.role),
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserById(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'preference'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarS3Key: user.avatarS3Key,
      bio: user.bio,
      roles: user.roles.map((r) => r.role),
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      preference: user.preference,
    };
  }

  async updateUserRoles(userId: string, updateRolesDto: UpdateUserRolesDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!updateRolesDto.roles || updateRolesDto.roles.length === 0) {
      throw new BadRequestException('User must have at least one role');
    }

    try {
      await this.userRoleRepository.delete({ userId });

      const newRoles = updateRolesDto.roles.map((role) => {
        const userRole = new UserRole();
        userRole.userId = userId;
        userRole.role = role;
        return userRole;
      });

      await this.userRoleRepository.save(newRoles);

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: updateRolesDto.roles,
        message: 'User roles updated successfully',
      };
    } catch (error) {
        mapToInternalException(error, 'Failed to update user roles');
    }
  }

  async activateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      throw new BadRequestException('User is already active');
    }

    try {
      user.isActive = true;
      await this.userRepository.save(user);

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isActive: user.isActive,
        message: 'User activated successfully',
      };
    } catch (error) {
        mapToInternalException(error, 'Failed to activate user');
    }
  }

  async deactivateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User is already inactive');
    }

    try {
      user.isActive = false;
      await this.userRepository.save(user);

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isActive: user.isActive,
        message: 'User deactivated successfully',
      };
    } catch (error) {
        mapToInternalException(error, 'Failed to deactivate user');
    }
  }

  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.userRoleRepository.delete({ userId });

      await this.userRepository.delete(userId);

      return {
        message: 'User deleted successfully',
        deletedUserId: userId,
      };
    } catch (error) {
        mapToInternalException(error, 'Failed to delete user');
    }
  }

  async getUserStats() {
    try {
      const totalUsers = await this.userRepository.count();

      const activeUsers = await this.userRepository.count({
        where: { isActive: true },
      });

      const inactiveUsers = await this.userRepository.count({
        where: { isActive: false },
      });

      const roleStats = await this.userRoleRepository
        .createQueryBuilder('role')
        .select('role.role', 'role')
        .addSelect('COUNT(role.userId)', 'count')
        .groupBy('role.role')
        .getRawMany();

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        byRole: roleStats.reduce(
          (acc, stat) => {
            acc[stat.role] = parseInt(stat.count, 10);
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    } catch (error) {
        mapToInternalException(error, 'Failed to get user statistics');
    }
  }
}
