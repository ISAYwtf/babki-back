import { IsDateString } from 'class-validator';

export class UpdateAccountQueryDto {
  @IsDateString()
  date: string;
}
