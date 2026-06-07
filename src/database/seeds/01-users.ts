import { INestApplicationContext } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../modules/users/users.service';

export async function seedUsers(app: INestApplicationContext) {
  const usersService = app.get(UsersService);
  const passwordHash = await bcrypt.hash('Test1234!', 12);

  const user = await usersService.createWithPassword(
    {
      firstName: 'Alex',
      lastName: 'Testov',
      email: 'test@test.com',
    },
    passwordHash,
  );

  return { userId: String(user._id) };
}
