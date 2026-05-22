import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRole, UserRoleEnum } from '../entities/user-role.entity';
import { UserPreference } from '../entities/user-preference.entity';
import {mapToInternalException} from '../common/runtime-exception.helper';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, displayName } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = this.userRepository.create({
      email,
      passwordHash,
      displayName,
      isActive: true,
    });

    try {
      const savedUser = await this.userRepository.save(user);

      const userRole = this.userRoleRepository.create({
        userId: savedUser.id,
        role: UserRoleEnum.LEARNER,
      });
      await this.userRoleRepository.save(userRole);

      const userPreference = this.userPreferenceRepository.create({
        userId: savedUser.id,
        darkModeEnabled: false,
        preferredLocale: 'id-ID',
        onboardingCompleted: false,
      });
      await this.userPreferenceRepository.save(userPreference);

      const payload: JwtPayload = {
        sub: savedUser.id,
        email: savedUser.email,
        roles: [UserRoleEnum.LEARNER],
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        user: {
          id: savedUser.id,
          displayName: savedUser.displayName,
          roles: [UserRoleEnum.LEARNER],
        },
        accessToken,
      };
    } catch (error) {
        mapToInternalException(error, 'Failed to create user');
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.email = :email', { email })
      .addSelect('user.passwordHash')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const roles = user.roles.map((r) => r.role);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        roles,
      },
      accessToken,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: userId })
      .addSelect('user.passwordHash')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    user.passwordHash = passwordHash;
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}
