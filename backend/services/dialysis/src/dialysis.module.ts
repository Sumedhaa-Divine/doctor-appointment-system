import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DIALYSIS_ENTITIES } from './entities';
import { OutboxRelay, DIALYSIS_EVENTS_QUEUE } from './integration/outbox.relay';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature(DIALYSIS_ENTITIES), BullModule.registerQueue({ name: DIALYSIS_EVENTS_QUEUE })],
  controllers: [SessionsController],
  providers: [SessionsService, OutboxRelay],
})
export class DialysisModule {}
