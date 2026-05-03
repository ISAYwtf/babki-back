import { IsDateString } from 'class-validator';

export class UpdateSavingSnapshotQueryDto {
  @IsDateString()
  date: string;
}
