import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { CreateAccountDto } from '../dto/create.dto';
import { FindAccountQueryDto } from '../dto/find-query.dto';
import { SavingsService } from './savings.service';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  find(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: FindAccountQueryDto,
  ) {
    return this.savingsService.find(currentUser.userId, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createSavingDto: CreateAccountDto,
  ) {
    return this.savingsService.create(currentUser.userId, createSavingDto);
  }
}
