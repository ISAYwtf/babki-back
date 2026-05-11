import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { CreateAccountDto } from '../dto/create.dto';

@Injectable()
export class SavingsService {
  constructor(private readonly accountsService: AccountsService) {}

  async find(userId: string) {
    return this.accountsService.findByParams(userId, { type: 'saving' });
  }

  async create(userId: string, createSavingDto: CreateAccountDto) {
    return this.accountsService.create(
      userId,
      { type: 'saving' },
      createSavingDto,
    );
  }
}
