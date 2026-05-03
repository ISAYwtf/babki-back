import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { ListSavingTransactionsQueryDto } from './dto/list-saving-transactions-query.dto';
import { SavingsTransactionsService } from './savings-transactions.service';

// TODO Добавить эндпоинт удаления транзакции с обновлением сумм в снэпшотах
@Controller('snapshots/:snapshotId/transactions')
export class SavingsTransactionsController {
  constructor(
    private readonly savingTransactionsService: SavingsTransactionsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('snapshotId', ParseObjectIdPipe) snapshotId: string,
    @Query() query: ListSavingTransactionsQueryDto,
  ) {
    return this.savingTransactionsService.findAll(
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
    return this.savingTransactionsService.findOne(
      currentUser.userId,
      snapshotId,
      savingTransactionId,
    );
  }
}
