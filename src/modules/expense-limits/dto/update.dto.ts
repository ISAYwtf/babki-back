import { IsNumber, Min } from 'class-validator';

export class UpdateExpenseLimitDto {
  @IsNumber()
  @Min(0.01)
  total: number;
}
