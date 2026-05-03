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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountsService } from './accounts.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { FindAccountQueryDto } from './dto/find-account-query.dto';

// TODO Добавить транзакции
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findByUserId(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: FindAccountQueryDto,
  ) {
    return this.accountsService.findByUserId(
      currentUser.userId,
      query.asOfDate,
    );
  }

  @Post()
  add(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.accountsService.addAccount(
      currentUser.userId,
      createAccountDto,
    );
  }

  @Patch(':accountId')
  update(
    @Param('accountId', ParseObjectIdPipe) accountId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountsService.updateAccount(
      currentUser.userId,
      accountId,
      updateAccountDto,
    );
  }

  @Delete(':accountId')
  remove(
    @Param('accountId', ParseObjectIdPipe) accountId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.accountsService.deleteAccount(currentUser.userId, accountId);
  }
}
