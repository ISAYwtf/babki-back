import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { CreateAccountDto } from '../dto/create.dto';
import { FindAccountQueryDto } from '../dto/find-query.dto';
import { BalancesService } from './balances.service';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  find(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: FindAccountQueryDto,
  ) {
    return this.balancesService.find(currentUser.userId, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createSavingDto: CreateAccountDto,
  ) {
    return this.balancesService.create(currentUser.userId, createSavingDto);
  }
}
