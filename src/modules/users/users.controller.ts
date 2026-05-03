import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  findMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findProfile(currentUser.userId);
  }

  @Patch('me')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(currentUser.userId, updateUserDto);
  }

  @Delete('me')
  remove(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.remove(currentUser.userId);
  }
}
