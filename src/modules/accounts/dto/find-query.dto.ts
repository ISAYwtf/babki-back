import { IsOptional, IsIn, IsDateString } from 'class-validator';
import { type AccountType, accountTypes } from '../schemas/accounts.schema';

export class FindAccountQueryDto {
  @IsOptional()
  @IsIn(accountTypes)
  type?: AccountType;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
