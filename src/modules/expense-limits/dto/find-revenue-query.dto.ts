import { IsDateString, IsMongoId } from 'class-validator';

export class FindExpenseLimitRevenueQueryDto {
  @IsMongoId()
  categoryId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
