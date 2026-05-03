import { Type } from 'class-transformer';
import { IsDateString, IsNumber, Min } from 'class-validator';

export class CreateSavingSnapshotDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsDateString()
  date: string;
}
