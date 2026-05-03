import { IsDateString } from 'class-validator';

export class UpdateSavingQueryDto {
  @IsDateString()
  date: string;
}
