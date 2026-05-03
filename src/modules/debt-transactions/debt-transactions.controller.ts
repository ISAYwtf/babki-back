import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ListDebtTransactionsQueryDto } from './dto/list-debt-transactions-query.dto';
import { DebtTransactionsService } from './debt-transactions.service';

@Controller('debts/:debtId/transactions')
export class DebtTransactionsController {
  constructor(
    private readonly debtTransactionsService: DebtTransactionsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
    @Query() query: ListDebtTransactionsQueryDto,
  ) {
    return this.debtTransactionsService.findAll(
      currentUser.userId,
      debtId,
      query,
    );
  }

  @Get(':debtTransactionId')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('debtId', ParseObjectIdPipe) debtId: string,
    @Param('debtTransactionId', ParseObjectIdPipe) debtTransactionId: string,
  ) {
    return this.debtTransactionsService.findOne(
      currentUser.userId,
      debtId,
      debtTransactionId,
    );
  }
}
