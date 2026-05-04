import { IsDateString } from 'class-validator';

export class UpdateAccountSnapshotQueryDto {
  @IsDateString()
  date: string;
}
