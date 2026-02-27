import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { oracleProvider } from './providers/oracle/oracle.provider';


@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, oracleProvider],
})
export class AppModule {}
