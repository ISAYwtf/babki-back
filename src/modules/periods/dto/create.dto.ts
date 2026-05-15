import { IsDateString } from 'class-validator';

export class CreatePeriodDto {
  @IsDateString()
  startDate: number;

  @IsDateString()
  endDate: number;
}
