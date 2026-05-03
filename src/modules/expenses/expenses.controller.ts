import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(currentUser.userId, createExpenseDto);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListExpensesQueryDto,
  ) {
    return this.expensesService.findAll(currentUser.userId, query);
  }

  @Get(':expenseId')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('expenseId', ParseObjectIdPipe) expenseId: string,
  ) {
    return this.expensesService.findOne(currentUser.userId, expenseId);
  }

  @Patch(':expenseId')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('expenseId', ParseObjectIdPipe) expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(
      currentUser.userId,
      expenseId,
      updateExpenseDto,
    );
  }

  @Delete(':expenseId')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('expenseId', ParseObjectIdPipe) expenseId: string,
  ) {
    return this.expensesService.remove(currentUser.userId, expenseId);
  }
}
