import { Type } from 'class-transformer';
import { IsDateString, IsMongoId, IsNumber } from 'class-validator';

export class CreateSavingSnapshotTransactionDto {
  @IsMongoId()
  snapshotId: string;

  @IsDateString()
  transactionDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;
}
