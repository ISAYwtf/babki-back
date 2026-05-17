import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { CreateAccountDto } from '../dto/create.dto';
import { FindAccountQueryDto } from '../dto/find-query.dto';

@Injectable()
export class BalancesService {
  constructor(private readonly accountsService: AccountsService) {}

  async find(userId: string, query: FindAccountQueryDto) {
    const accounts = await this.accountsService.findByParams(userId, {
      type: 'balance',
      toDate: query.toDate,
    });
    return accounts[0];
  }

  async create(userId: string, createSavingDto: CreateAccountDto) {
    return this.accountsService.create(
      userId,
      { type: 'balance' },
      createSavingDto,
    );
  }
}
