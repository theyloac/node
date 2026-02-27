import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { oracleProvider } from './providers/oracle/oracle.provider';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';


@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, AuthController, UsersController],
  providers: [AppService, AuthService, UsersService, oracleProvider],
})
export class AppModule {}
