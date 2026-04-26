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
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateIncomeDto } from './dto/create-income.dto';
import { FindIncomeRevenueQueryDto } from './dto/find-income-revenue-query.dto';
import { ListIncomesQueryDto } from './dto/list-incomes-query.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesService } from './incomes.service';

@Controller('users/:userId/incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  create(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() createIncomeDto: CreateIncomeDto,
  ) {
    return this.incomesService.create(userId, createIncomeDto);
  }

  @Get()
  findAll(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: ListIncomesQueryDto,
  ) {
    return this.incomesService.findAll(userId, query);
  }

  @Get('revenue')
  findRevenue(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: FindIncomeRevenueQueryDto,
  ) {
    return this.incomesService.findRevenue(userId, query);
  }

  @Get(':incomeId')
  findOne(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('incomeId', ParseObjectIdPipe) incomeId: string,
  ) {
    return this.incomesService.findOne(userId, incomeId);
  }

  @Patch(':incomeId')
  update(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('incomeId', ParseObjectIdPipe) incomeId: string,
    @Body() updateIncomeDto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(userId, incomeId, updateIncomeDto);
  }

  @Delete(':incomeId')
  remove(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('incomeId', ParseObjectIdPipe) incomeId: string,
  ) {
    return this.incomesService.remove(userId, incomeId);
  }
}
