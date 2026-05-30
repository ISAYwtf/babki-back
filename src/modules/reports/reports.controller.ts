import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { MonthlyReportsQueryDto } from './dto/monthly-reports-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('months')
  findMonthly(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: MonthlyReportsQueryDto,
  ) {
    return this.reportsService.findMonthly(currentUser.userId, query);
  }

  @Get('years')
  findYearly(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.reportsService.findYearly(currentUser.userId);
  }
}
