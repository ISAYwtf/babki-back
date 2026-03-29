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
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('users/:userId/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(userId, createExpenseDto);
  }

  @Get()
  findAll(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Query() query: ListExpensesQueryDto,
  ) {
    return this.expensesService.findAll(userId, query);
  }

  @Get(':expenseId')
  findOne(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('expenseId', ParseObjectIdPipe) expenseId: string,
  ) {
    return this.expensesService.findOne(userId, expenseId);
  }

  @Patch(':expenseId')
  update(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('expenseId', ParseObjectIdPipe) expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(userId, expenseId, updateExpenseDto);
  }

  @Delete(':expenseId')
  remove(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('expenseId', ParseObjectIdPipe) expenseId: string,
  ) {
    return this.expensesService.remove(userId, expenseId);
  }
}
