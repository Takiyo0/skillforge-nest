import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from '../../entities/user-role.entity';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'Array of user roles',
    enum: UserRoleEnum,
    isArray: true,
  })
  @IsArray()
  @IsEnum(UserRoleEnum, { each: true })
  roles: UserRoleEnum[];
}

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'User status (active or inactive)',
    enum: ['active', 'inactive'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';
}

export class ListUsersQueryDto {
  @ApiProperty({
    description: 'Search term for user name or email',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by user role',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    description: 'Filter by user status',
    enum: ['active', 'inactive'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({
    description: 'Results per page for pagination',
    required: false,
  })
  @IsOptional()
  @IsString()
  limit?: string;
}
