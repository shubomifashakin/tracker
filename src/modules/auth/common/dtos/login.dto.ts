import { IsEmail, IsEnum, IsString } from 'class-validator';

import { UserRoles } from '../../../../common/constants';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(UserRoles)
  role: UserRoles;
}
