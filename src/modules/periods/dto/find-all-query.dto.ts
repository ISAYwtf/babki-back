import { IsDateString, IsOptional } from 'class-validator';

export class FindAllPeriodsQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
