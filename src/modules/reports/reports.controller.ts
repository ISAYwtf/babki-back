import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { MonthSummaryQueryDto } from './dto/month-summary-query.dto';
import { YearSummaryQueryDto } from './dto/year-summary-query.dto';
import { ReportsService } from './reports.service';

@Controller('summaries')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('month')
  getMonthlySummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: MonthSummaryQueryDto,
  ) {
    return this.reportsService.getMonthlySummary(
      currentUser.userId,
      query.year,
      query.month,
    );
  }

  @Get('year')
  getYearlySummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: YearSummaryQueryDto,
  ) {
    return this.reportsService.getYearlySummary(currentUser.userId, query.year);
  }
}
