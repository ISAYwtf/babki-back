import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UpdateAccountSnapshotDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;
}
