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
import { CreateSavingSnapshotDto } from './dto/create-snapshot.dto';
import { SavingsSnapshotsService } from './savings-snapshots.service';
import { FindSavingSnapshotQueryDto } from './dto/find-snapshot-query.dto';

@Controller('savings/:savingId/snapshots')
export class SavingsSnapshotsController {
  constructor(
    private readonly savingsSnapshotsService: SavingsSnapshotsService,
  ) {}

  @Get()
  findBySavingId(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('savingId', ParseObjectIdPipe) savingId: string,
    @Query() query: FindSavingSnapshotQueryDto,
  ) {
    return this.savingsSnapshotsService.findBySavingId(
      currentUser.userId,
      savingId,
      query.date,
    );
  }

  @Post()
  add(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('savingId', ParseObjectIdPipe) savingId: string,
    @Body() createSavingDto: CreateSavingSnapshotDto,
  ) {
    return this.savingsSnapshotsService.create(
      currentUser.userId,
      savingId,
      createSavingDto,
    );
  }

  @Delete(':snapshotId')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('snapshotId', ParseObjectIdPipe) snapshotId: string,
    @Param('savingId', ParseObjectIdPipe) savingId: string,
  ) {
    return this.savingsSnapshotsService.deleteEntity(
      currentUser.userId,
      savingId,
      snapshotId,
    );
  }
}
