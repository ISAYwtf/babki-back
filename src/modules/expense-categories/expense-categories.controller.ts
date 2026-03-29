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

@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Post()
  create(@Body() createExpenseCategoryDto: CreateExpenseCategoryDto) {
    return this.expenseCategoriesService.create(createExpenseCategoryDto);
  }

  @Get()
  findAll() {
    return this.expenseCategoriesService.findAll();
  }

  @Get(':categoryId')
  findOne(@Param('categoryId', ParseObjectIdPipe) categoryId: string) {
    return this.expenseCategoriesService.findOne(categoryId);
  }

  @Patch(':categoryId')
  update(
    @Param('categoryId', ParseObjectIdPipe) categoryId: string,
    @Body() updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ) {
    return this.expenseCategoriesService.update(
      categoryId,
      updateExpenseCategoryDto,
    );
  }

  @Delete(':categoryId')
  remove(@Param('categoryId', ParseObjectIdPipe) categoryId: string) {
    return this.expenseCategoriesService.remove(categoryId);
  }
}
