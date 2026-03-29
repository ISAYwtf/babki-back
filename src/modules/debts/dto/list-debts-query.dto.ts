import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { debtStatuses } from '../schemas/debt.schema';

export class ListDebtsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(debtStatuses)
  status?: (typeof debtStatuses)[number];
}
