import { IsMongoId, IsNumber, Min } from 'class-validator';

export class CreateExpenseLimitDto {
  @IsMongoId()
  categoryId: string;

  @IsNumber()
  @Min(0.01)
  total: number;
}
