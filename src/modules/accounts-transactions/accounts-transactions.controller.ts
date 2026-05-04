import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ListAccountTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { AccountsTransactionsService } from './accounts-transactions.service';

// TODO Добавить эндпоинт удаления транзакции с обновлением сумм в снэпшотах
@Controller('snapshots/:snapshotId/transactions')
export class AccountsTransactionsController {
  constructor(
    private readonly accountsTransactionsService: AccountsTransactionsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('snapshotId', ParseObjectIdPipe) snapshotId: string,
    @Query() query: ListAccountTransactionsQueryDto,
  ) {
    return this.accountsTransactionsService.findAll(
      currentUser.userId,
      snapshotId,
      query,
    );
  }

  @Get(':savingTransactionId')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('snapshotId', ParseObjectIdPipe) snapshotId: string,
    @Param('savingTransactionId', ParseObjectIdPipe)
    savingTransactionId: string,
  ) {
    return this.accountsTransactionsService.findOne(
      currentUser.userId,
      snapshotId,
      savingTransactionId,
    );
  }
}
