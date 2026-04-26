import { IsDateString, IsOptional } from 'class-validator';

export class FindIncomeRevenueQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
