import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { Period, PeriodsSchema } from './schemas/periods.schema';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: Period.name, schema: PeriodsSchema }]),
  ],
  controllers: [PeriodsController],
  providers: [PeriodsService],
  exports: [MongooseModule, PeriodsService],
})
export class PeriodsModule {}
