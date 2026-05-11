import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { CreateSaveDto } from './dto/create-save.dto';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import { UpdateSaveDto } from './dto/update-save.dto';
import { SavesService } from './saves.service';

@Controller('saves')
export class SavesController {
  constructor(private readonly savesService: SavesService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createIncomeDto: CreateSaveDto,
  ) {
    return this.savesService.create(currentUser.userId, createIncomeDto);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.savesService.findAll(currentUser.userId, query);
  }

  @Get('revenue')
  findRevenue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.savesService.findRevenue(currentUser.userId, query);
  }

  @Get(':saveId')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('saveId', ParseObjectIdPipe) saveId: string,
  ) {
    return this.savesService.findOne(currentUser.userId, saveId);
  }

  @Patch(':saveId')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('saveId', ParseObjectIdPipe)
    saveId: string,
    @Body() updateIncomeDto: UpdateSaveDto,
  ) {
    return this.savesService.update(
      currentUser.userId,
      saveId,
      updateIncomeDto,
    );
  }
}
