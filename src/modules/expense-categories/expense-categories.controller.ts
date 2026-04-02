import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategoriesService } from './expense-categories.service';

@Controller('users/:userId/expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Post()
  create(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Body() createExpenseCategoryDto: CreateExpenseCategoryDto,
  ) {
    return this.expenseCategoriesService.create(
      userId,
      createExpenseCategoryDto,
    );
  }

  @Get()
  findAll(@Param('userId', ParseObjectIdPipe) userId: string) {
    return this.expenseCategoriesService.findAll(userId);
  }

  @Get(':categoryId')
  findOne(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('categoryId', ParseObjectIdPipe) categoryId: string,
  ) {
    return this.expenseCategoriesService.findOne(userId, categoryId);
  }

  @Patch(':categoryId')
  update(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('categoryId', ParseObjectIdPipe) categoryId: string,
    @Body() updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ) {
    return this.expenseCategoriesService.update(
      userId,
      categoryId,
      updateExpenseCategoryDto,
    );
  }

  @Delete(':categoryId')
  remove(
    @Param('userId', ParseObjectIdPipe) userId: string,
    @Param('categoryId', ParseObjectIdPipe) categoryId: string,
  ) {
    return this.expenseCategoriesService.remove(userId, categoryId);
  }
}
