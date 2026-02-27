import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, getConnection, getConnectionOptions } from 'oracledb';

export const ORACLE_CONNECTION = 'ORACLE_CONNECTION';

/**
 * Provider that creates and exports an Oracle DB connection using configuration values.
 *
 * The provider is asynchronous since the client must open a connection before
 * being injected elsewhere in the application. It uses the NestJS ConfigService
 * to pull credentials from environment variables (see `.env` file).
 */
export const oracleProvider: Provider = {
  provide: ORACLE_CONNECTION,
  useFactory: async (config: ConfigService): Promise<Connection> => {
    // the sample `.env` uses DB_* variables, so read those by default
    const user = config.get<string>('DB_USER') || config.get<string>('ORACLE_USER');
    const password = config.get<string>('DB_PASS') || config.get<string>('ORACLE_PASSWORD');
    const connectString =
      config.get<string>('DB_CONNECT_STRING') ||
      config.get<string>('ORACLE_CONNECTION_STRING');

    // ensure required values exist
    if (!user || !password || !connectString) {
      throw new Error('Oracle configuration is incomplete');
    }

    // create and return a new connection
    const conn = await getConnection({
      user,
      password,
      connectString,
    });

    return conn;
  },
  inject: [ConfigService],
};
