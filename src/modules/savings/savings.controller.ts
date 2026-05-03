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
import { CreateSavingDto } from './dto/create.dto';
import { UpdateSavingQueryDto } from './dto/update-query.dto';
import { UpdateSavingDto } from './dto/update.dto';
import { SavingsService } from './savings.service';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  findByUserId(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.savingsService.findByUserId(currentUser.userId);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createSavingDto: CreateSavingDto,
  ) {
    return this.savingsService.create(currentUser.userId, createSavingDto);
  }

  @Patch(':savingId')
  updateAmount(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('savingId') savingId: string,
    @Query() updateQueryDto: UpdateSavingQueryDto,
    @Body() updateSavingDto: UpdateSavingDto,
  ) {
    return this.savingsService.updateAmount(
      currentUser.userId,
      savingId,
      updateQueryDto,
      updateSavingDto,
    );
  }

  @Delete(':savingId')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('savingId', ParseObjectIdPipe) savingId: string,
  ) {
    return this.savingsService.deleteEntity(currentUser.userId, savingId);
  }
}
