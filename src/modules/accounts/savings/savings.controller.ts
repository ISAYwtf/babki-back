import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { CreateAccountDto } from '../dto/create.dto';
import { SavingsService } from './savings.service';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  find(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.savingsService.find(currentUser.userId);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createSavingDto: CreateAccountDto,
  ) {
    return this.savingsService.create(currentUser.userId, createSavingDto);
  }
}
