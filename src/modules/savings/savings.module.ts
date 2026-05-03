import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavingsSnapshotsModule } from '../savings-snapshots/savings-snapshots.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Saving, SavingsSchema } from './schemas/savings.schema';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';

@Module({
  imports: [
    SavingsSnapshotsModule,
    MongooseModule.forFeature([
      { name: Saving.name, schema: SavingsSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SavingsController],
  providers: [SavingsService],
  exports: [MongooseModule, SavingsService],
})
export class SavingsModule {}
