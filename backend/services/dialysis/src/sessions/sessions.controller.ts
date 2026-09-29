import { Body, Controller, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Actor, SessionsService } from './sessions.service';
import {
  AbortSessionDto,
  CompleteSessionDto,
  ObservationDto,
  RecordConsumablesDto,
  ScheduleSessionDto,
  StartSessionDto,
} from './dto';

// The API gateway authenticates and forwards the user; routes arrive without the /dialysis prefix.
function actorOf(req: Request): Actor {
  const user = (req as any).user ?? {};
  return { userId: user.sub ?? user.id, role: user.role, permissions: user.permissions ?? [] };
}

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  schedule(@Body() dto: ScheduleSessionDto, @Req() req: Request) {
    return this.sessions.schedule(dto, actorOf(req));
  }

  @Post(':id/check-in')
  checkIn(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.sessions.checkIn(id, actorOf(req));
  }

  @Post(':id/pre-assessment')
  preAssess(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.sessions.preAssess(id, actorOf(req));
  }

  @Post(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StartSessionDto, @Req() req: Request) {
    return this.sessions.start(id, dto, actorOf(req));
  }

  @Post(':id/observations')
  observe(@Param('id', ParseUUIDPipe) id: string, @Body() body: ObservationDto[]) {
    return this.sessions.recordObservations(id, body);
  }

  @Post(':id/consumables')
  consumables(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordConsumablesDto) {
    return this.sessions.recordConsumables(id, dto);
  }

  @Post(':id/end')
  end(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.sessions.end(id, actorOf(req));
  }

  @Post(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteSessionDto, @Req() req: Request) {
    return this.sessions.complete(id, dto, actorOf(req));
  }

  @Post(':id/abort')
  abort(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AbortSessionDto, @Req() req: Request) {
    return this.sessions.abort(id, dto, actorOf(req));
  }

  @Post(':id/verify')
  verify(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.sessions.verify(id, actorOf(req));
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body('reason') reason: string, @Req() req: Request) {
    return this.sessions.cancel(id, reason, actorOf(req));
  }
}
