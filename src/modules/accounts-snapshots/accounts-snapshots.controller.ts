import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateAccountSnapshotDto } from './dto/create.dto';
import { AccountsSnapshotsService } from './accounts-snapshots.service';
import { FindAccountSnapshotQueryDto } from './dto/find-query.dto';

@Controller('accounts/:accountId/snapshots')
export class AccountsSnapshotsController {
  constructor(private readonly snapshotsService: AccountsSnapshotsService) {}

  @Get()
  findByAccountId(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseObjectIdPipe) accountId: string,
    @Query() query: FindAccountSnapshotQueryDto,
  ) {
    return this.snapshotsService.findByAccountId(
      currentUser.userId,
      accountId,
      query.date,
    );
  }

  @Post()
  add(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseObjectIdPipe) accountId: string,
    @Body() createSavingDto: CreateAccountSnapshotDto,
  ) {
    return this.snapshotsService.create(
      currentUser.userId,
      accountId,
      createSavingDto,
    );
  }

  @Delete(':snapshotId')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('snapshotId', ParseObjectIdPipe) snapshotId: string,
    @Param('accountId', ParseObjectIdPipe) savingId: string,
  ) {
    return this.snapshotsService.deleteEntity(
      currentUser.userId,
      savingId,
      snapshotId,
    );
  }
}
