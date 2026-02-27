import { Inject, Injectable } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { Connection } from 'oracledb';
import { ORACLE_CONNECTION } from '../providers/oracle/oracle.provider';

// Service used by the users controller to fetch user information from the
// database. Separation of concerns keeps the controller focused on HTTP.

@Injectable()
export class UsersService {
  constructor(@Inject(ORACLE_CONNECTION) private readonly conn: Connection) {}

  /**
   * Call the PL/SQL function getUserFromID in the FIDZULU package.
   * The returned value is whatever the database function produces (likely a
   * JSON string or structured type).
   */
  async getUserFromID(id: number): Promise<any> {
    const sql = 'BEGIN :ret := FIDZULU.Auth_Pkg.getUserFromID(:id); END;';
    const binds = {
      ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      id,
    } as any;

    const result = await this.conn.execute(sql, binds);
    return result.outBinds?.ret;
  }
}
