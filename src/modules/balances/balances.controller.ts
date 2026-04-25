import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateBalanceDto } from './dto/create-balance.dto';
import { BalancesService } from './balances.service';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { FindBalanceQueryDto } from './dto/find-balance-query.dto';

@Controller('users/:userId/balance')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  findByUserId(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: FindBalanceQueryDto,
  ) {
    return this.balancesService.findByUserId(userId, query.asOfDate);
  }

  @Post()
  add(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() createBalanceDto: CreateBalanceDto,
  ) {
    return this.balancesService.addBalance(userId, createBalanceDto);
  }

  @Patch(':balanceId')
  update(
    @Param('balanceId', ParseObjectIdPipe) balanceId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() updateBalanceDto: UpdateBalanceDto,
  ) {
    return this.balancesService.updateBalance(
      userId,
      balanceId,
      updateBalanceDto,
    );
  }

  @Delete(':balanceId')
  remove(
    @Param('balanceId', ParseObjectIdPipe) balanceId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
  ) {
    return this.balancesService.deleteBalance(userId, balanceId);
  }
}
