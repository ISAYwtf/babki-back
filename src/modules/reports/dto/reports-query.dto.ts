import { Transform } from 'class-transformer';
import { IsArray, IsMongoId, IsOptional } from 'class-validator';

export class ReportsQueryDto {
  @IsOptional()
  @Transform(({ value }): string[] =>
    typeof value === 'string' ? value.split(',') : (value as string[]),
  )
  @IsArray()
  @IsMongoId({ each: true })
  categories?: string[];
}
