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
    // getUserFromId is a procedure not a function, don't return anything
    const sql = `
      BEGIN
        auth_Pkg.getUserFromID(
          p_user_id   => :id,
          p_first_name=> :firstName,
          p_last_name => :lastName,
          p_username  => :username,
          p_email     => :email,
          p_role      => :role
        );
      END;
    `;


    const binds = {
      id: id,
      firstName: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      lastName: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      username: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      email: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      role: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
    } as any;

    const result = await this.conn.execute(sql, binds);
    return {
      firstName: result.outBinds?.firstName,
      lastName: result.outBinds?.lastName,
      username: result.outBinds?.username,
      email: result.outBinds?.email,
      role: result.outBinds?.role,
    }
  }
}
