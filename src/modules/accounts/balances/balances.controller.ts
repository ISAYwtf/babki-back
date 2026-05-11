import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { CreateAccountDto } from '../dto/create.dto';
import { BalancesService } from './balances.service';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  find(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.balancesService.find(currentUser.userId);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createSavingDto: CreateAccountDto,
  ) {
    return this.balancesService.create(currentUser.userId, createSavingDto);
  }
}
