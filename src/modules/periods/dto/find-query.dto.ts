import { IsDateString } from 'class-validator';

export class FindPeriodQueryDto {
  @IsDateString()
  date: string;
}
