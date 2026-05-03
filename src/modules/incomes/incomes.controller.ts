import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateIncomeDto } from './dto/create-income.dto';
import { FindIncomeRevenueQueryDto } from './dto/find-income-revenue-query.dto';
import { ListIncomesQueryDto } from './dto/list-incomes-query.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesService } from './incomes.service';

@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createIncomeDto: CreateIncomeDto,
  ) {
    return this.incomesService.create(currentUser.userId, createIncomeDto);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListIncomesQueryDto,
  ) {
    return this.incomesService.findAll(currentUser.userId, query);
  }

  @Get('revenue')
  findRevenue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: FindIncomeRevenueQueryDto,
  ) {
    return this.incomesService.findRevenue(currentUser.userId, query);
  }

  @Get(':incomeId')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('incomeId', ParseObjectIdPipe) incomeId: string,
  ) {
    return this.incomesService.findOne(currentUser.userId, incomeId);
  }

  @Patch(':incomeId')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('incomeId', ParseObjectIdPipe) incomeId: string,
    @Body() updateIncomeDto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(
      currentUser.userId,
      incomeId,
      updateIncomeDto,
    );
  }

  @Delete(':incomeId')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('incomeId', ParseObjectIdPipe) incomeId: string,
  ) {
    return this.incomesService.remove(currentUser.userId, incomeId);
  }
}
