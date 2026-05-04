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
import { CreateAccountDto } from './dto/create.dto';
import { AccountsService } from './accounts.service';
import { UpdateAccountQueryDto } from './dto/update-query.dto';
import { UpdateAccountDto } from './dto/update.dto';

// TODO Добавить транзакции
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findByUserId(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.accountsService.findByUserId(currentUser.userId);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.accountsService.create(currentUser.userId, createAccountDto);
  }

  @Patch(':accountId')
  updateAmount(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseObjectIdPipe) accountId: string,
    @Query() updateQueryDto: UpdateAccountQueryDto,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountsService.updateAmount(
      currentUser.userId,
      accountId,
      updateQueryDto,
      updateAccountDto,
    );
  }

  @Delete(':accountId')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseObjectIdPipe) accountId: string,
  ) {
    return this.accountsService.deleteEntity(currentUser.userId, accountId);
  }
}
