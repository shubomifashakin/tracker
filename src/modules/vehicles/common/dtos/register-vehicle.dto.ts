import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class RegisterVehicleDto {
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsNumber()
  year: number;

  @IsString()
  @IsNotEmpty()
  color: string;
}
