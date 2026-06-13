import { IsDateString, IsOptional } from 'class-validator';
import { ReportsQueryDto } from './reports-query.dto';

export class MonthlyReportsQueryDto extends ReportsQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
