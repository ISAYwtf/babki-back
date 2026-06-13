import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { planStatuses } from '../schemas/plan.schema';

export class ListPlansQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(planStatuses)
  status?: (typeof planStatuses)[number];
}
