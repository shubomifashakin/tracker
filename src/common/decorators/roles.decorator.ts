import { SetMetadata } from '@nestjs/common';

import { UserRoles } from '../constants';

export const RolesKey = 'Roles';

export function Role(role: UserRoles) {
  return SetMetadata(RolesKey, role);
}
