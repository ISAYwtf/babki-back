import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class FindExpenseLimitQueryDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsDateString()
  periodDate: string;
}
