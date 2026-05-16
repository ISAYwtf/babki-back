import {
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateExpenseLimitDto {
  @IsMongoId()
  categoryId: string;

  @IsNumber()
  @Min(0.01)
  total: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
