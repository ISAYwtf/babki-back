import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { CreatePeriodDto } from './dto/create.dto';
import { FindAllPeriodsQueryDto } from './dto/find-all-query.dto';
import { FindPeriodQueryDto } from './dto/find-query.dto';
import { PeriodsService } from './periods.service';

@Controller('periods')
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createDto: CreatePeriodDto,
  ) {
    return this.periodsService.create(currentUser.userId, createDto);
  }

  @Get()
  findByParams(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() findQueryDto: FindAllPeriodsQueryDto,
  ) {
    return this.periodsService.findByParams(currentUser.userId, findQueryDto);
  }

  @Get(':periodId')
  findById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('periodId', ParseObjectIdPipe) periodId: string,
  ) {
    return this.periodsService.findById(currentUser.userId, periodId);
  }

  @Get('by-date')
  findByDate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() findQueryDto: FindPeriodQueryDto,
  ) {
    return this.periodsService.findOneByDate(currentUser.userId, findQueryDto);
  }
}
