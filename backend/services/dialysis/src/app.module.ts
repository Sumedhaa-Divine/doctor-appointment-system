import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DialysisModule } from './dialysis.module';
import { DIALYSIS_ENTITIES } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'telehealth_dev',
        entities: DIALYSIS_ENTITIES,
      }),
      // The dialysis schema must exist before entities are synchronised.
      // Outside development, schema changes go through migrations instead.
      dataSourceFactory: async (options) => {
        const dataSource = await new DataSource({ ...options!, synchronize: false } as DataSourceOptions).initialize();
        await dataSource.query('CREATE SCHEMA IF NOT EXISTS dialysis');
        if (process.env.NODE_ENV === 'development') await dataSource.synchronize();
        return dataSource;
      },
    }),
    BullModule.forRoot({
      redis: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10) },
    }),
    DialysisModule,
  ],
})
export class AppModule {}
