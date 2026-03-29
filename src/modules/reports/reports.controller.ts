import { Controller, Get, Param, Query } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { MonthSummaryQueryDto } from './dto/month-summary-query.dto';
import { YearSummaryQueryDto } from './dto/year-summary-query.dto';
import { ReportsService } from './reports.service';

@Controller('users/:userId/summaries')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('month')
  getMonthlySummary(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: MonthSummaryQueryDto,
  ) {
    return this.reportsService.getMonthlySummary(
      userId,
      query.year,
      query.month,
    );
  }

  @Get('year')
  getYearlySummary(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: YearSummaryQueryDto,
  ) {
    return this.reportsService.getYearlySummary(userId, query.year);
  }
}
