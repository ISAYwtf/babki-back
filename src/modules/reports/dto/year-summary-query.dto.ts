import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class YearSummaryQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(3000)
  year: number;
}
