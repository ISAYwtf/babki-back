import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UpdateAccountDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;
}
