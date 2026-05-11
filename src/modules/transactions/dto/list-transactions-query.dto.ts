import { IsDateString, IsIn, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import {
  type TransactionType,
  transactionTypes,
} from '../schemas/transaction.schema';

export class ListTransactionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  snapshotId?: string;

  @IsOptional()
  @IsMongoId()
  accountId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsIn(transactionTypes)
  transactionType?: TransactionType;
}
