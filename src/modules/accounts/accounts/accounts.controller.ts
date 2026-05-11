import { Controller, Get, Param, Delete, Query } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { FindAccountQueryDto } from '../dto/find-query.dto';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findByParams(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() findQueryDto: FindAccountQueryDto,
  ) {
    return this.accountsService.findByParams(currentUser.userId, findQueryDto);
  }

  @Delete(':accountId')
  delete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseObjectIdPipe) accountId: string,
  ) {
    return this.accountsService.deleteEntity(currentUser.userId, accountId);
  }
}
