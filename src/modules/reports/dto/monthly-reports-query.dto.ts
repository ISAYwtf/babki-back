import { IsDateString, IsOptional } from 'class-validator';

export class MonthlyReportsQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
