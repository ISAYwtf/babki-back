import { IsDateString, IsOptional } from 'class-validator';

export class FindAccountSnapshotQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
