import { IsNumber } from 'class-validator';

export class DriverPingDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
