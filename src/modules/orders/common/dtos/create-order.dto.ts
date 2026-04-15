import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OrderDetailsDto {
  @IsString()
  description: string;

  @IsNumber()
  weight: number;

  @IsNumber()
  value: number;
}

export class CreateOrderDto {
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => StopDto)
  stops: StopDto[];

  @ValidateNested()
  @Type(() => OrderDetailsDto)
  details: OrderDetailsDto;
}

export class StopDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;
}
