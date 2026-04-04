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
import { CreateDebtDto } from './dto/create-debt.dto';
import { ListDebtsQueryDto } from './dto/list-debts-query.dto';
import { RepayDebtDto } from './dto/repay-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtsService } from './debts.service';

@Controller('users/:userId/debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  create(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() createDebtDto: CreateDebtDto,
  ) {
    return this.debtsService.create(userId, createDebtDto);
  }

  @Get()
  findAll(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: ListDebtsQueryDto,
  ) {
    return this.debtsService.findAll(userId, query);
  }

  @Get(':debtId')
  findOne(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
  ) {
    return this.debtsService.findOne(userId, debtId);
  }

  @Patch(':debtId')
  update(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
    @Body() updateDebtDto: UpdateDebtDto,
  ) {
    return this.debtsService.update(userId, debtId, updateDebtDto);
  }

  @Post(':debtId/repayments')
  repay(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
    @Body() repayDebtDto: RepayDebtDto,
  ) {
    return this.debtsService.repay(userId, debtId, repayDebtDto);
  }

  @Delete(':debtId')
  remove(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
  ) {
    return this.debtsService.remove(userId, debtId);
  }
}
