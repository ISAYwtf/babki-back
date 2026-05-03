import { IsDateString, IsOptional } from 'class-validator';

export class FindSavingSnapshotQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
