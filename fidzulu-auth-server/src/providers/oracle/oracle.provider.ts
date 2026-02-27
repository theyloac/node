import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, getConnection, getConnectionOptions } from 'oracledb';

// Create unique name tag for the Oracle connection provider, which can be used for injection in other parts of the application
export const ORACLE_CONNECTION = 'ORACLE_CONNECTION';

// :Provider means that this object need follow the provider interface
export const oracleProvider: Provider = {
  // Register this provider under the name ORACLE_CONNECTION"
  provide: ORACLE_CONNECTION,
  // Nest will inject the ConfigService into this factory function, which will be used to create the Oracle connection
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
