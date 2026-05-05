import { Type } from 'class-transformer';
import { IsMongoId, IsNumber } from 'class-validator';

export class SaveAccountDto {
  @IsMongoId()
  savingId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;
}
