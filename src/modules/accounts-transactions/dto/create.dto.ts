import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
} from 'class-validator';
import {
  transactionTypes,
  type TransactionType,
} from '../schemas/account-transaction.schema';

export class CreateAccountSnapshotTransactionDto {
  @IsMongoId()
  snapshotId: string;

  @IsDateString()
  transactionDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @IsOptional()
  @IsIn(transactionTypes)
  type?: TransactionType;
}
