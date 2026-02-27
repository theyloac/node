import { Inject, Injectable } from '@nestjs/common';
import { Connection } from 'oracledb';
import { ORACLE_CONNECTION } from './providers/oracle.provider';

@Injectable()
export class AppService {
  // the oracle connection will be instantiated by the provider defined in
  // `src/providers/oracle.provider.ts` and made available by the constant token.
  constructor(
    @Inject(ORACLE_CONNECTION) private readonly oracleConn: Connection,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  // example method showing how the connection might be used
  async getDbVersion(): Promise<string> {
    const result = await this.oracleConn.execute<string>('SELECT * FROM v$version');
    return JSON.stringify(result.rows);
  }
}
