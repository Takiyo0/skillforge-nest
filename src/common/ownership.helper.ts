import { NotFoundException } from '@nestjs/common';
import { UserRoleEnum } from '../entities';

export function ensureOwnerOrAdmin(creatorId: string, userOrId?: any) {
  if (!userOrId) {
    throw new NotFoundException('Not found');
  }

  const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
    const userRoles: any[] =
        typeof userOrId === 'object' ? userOrId.roles || [] : [];

    const isAdmin = userRoles.some(
        (r: any) => r === UserRoleEnum.ADMIN || r.role === UserRoleEnum.ADMIN,
    );
  if (isAdmin) return;

  if (!userId || creatorId !== userId) {
    throw new NotFoundException('Not found');
  }
}
