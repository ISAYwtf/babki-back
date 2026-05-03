import { IsDateString, IsOptional } from 'class-validator';

export class FindAccountQueryDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
