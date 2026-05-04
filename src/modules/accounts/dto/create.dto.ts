import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateAccountDto {
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;
}
