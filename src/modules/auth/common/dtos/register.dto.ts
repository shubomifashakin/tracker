import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

import { UserRoles } from '../../../../common/constants';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEnum(UserRoles)
  role: UserRoles;
}
