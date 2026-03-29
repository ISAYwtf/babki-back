import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UpsertBalanceDto } from './dto/upsert-balance.dto';
import { BalancesService } from './balances.service';

@Controller('users/:userId/balance')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  findByUserId(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.balancesService.findByUserId(userId);
  }

  @Put()
  upsert(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() upsertBalanceDto: UpsertBalanceDto,
  ) {
    return this.balancesService.upsert(userId, upsertBalanceDto);
  }
}
