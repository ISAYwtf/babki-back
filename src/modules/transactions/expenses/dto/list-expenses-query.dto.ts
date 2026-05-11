import { IsMongoId, IsOptional } from 'class-validator';
import { ListTransactionsQueryDto } from '../../dto/list-transactions-query.dto';

export class ListExpensesQueryDto extends ListTransactionsQueryDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;
}
