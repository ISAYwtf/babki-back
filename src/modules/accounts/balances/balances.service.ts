import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { CreateAccountDto } from '../dto/create.dto';

@Injectable()
export class BalancesService {
  constructor(private readonly accountsService: AccountsService) {}

  async find(userId: string) {
    return this.accountsService.findByParams(userId, { type: 'balance' });
  }

  async create(userId: string, createSavingDto: CreateAccountDto) {
    return this.accountsService.create(
      userId,
      { type: 'balance' },
      createSavingDto,
    );
  }
}
