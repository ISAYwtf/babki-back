import { IsDateString, IsOptional } from 'class-validator';

export class FindBalanceQueryDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
