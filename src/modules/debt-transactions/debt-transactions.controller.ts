import { Controller, Get, Param, Query } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ListDebtTransactionsQueryDto } from './dto/list-debt-transactions-query.dto';
import { DebtTransactionsService } from './debt-transactions.service';

@Controller('users/:userId/debts/:debtId/transactions')
export class DebtTransactionsController {
  constructor(
    private readonly debtTransactionsService: DebtTransactionsService,
  ) {}

  @Get()
  findAll(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
    @Query() query: ListDebtTransactionsQueryDto,
  ) {
    return this.debtTransactionsService.findAll(userId, debtId, query);
  }

  @Get(':debtTransactionId')
  findOne(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
    @Param('debtTransactionId', ParseObjectIdPipe) debtTransactionId: string,
  ) {
    return this.debtTransactionsService.findOne(
      userId,
      debtId,
      debtTransactionId,
    );
  }
}
