import { Inject, Injectable } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { Connection } from 'oracledb';
import { ORACLE_CONNECTION } from '../providers/oracle/oracle.provider';
import { LoginDto } from './dto/login.dto';

// AuthService encapsulates the business logic related to authentication.
// It is responsible for talking to the database layer (via an Oracle
// connection) and invoking the stored procedures in the FIDZULU package.

@Injectable()
export class AuthService {
  // The Oracle connection is injected using a custom provider token. This
  // keeps the database logic separate from the service and makes it easier to
  // mock during tests.
  constructor(@Inject(ORACLE_CONNECTION) private readonly conn: Connection) {}

  /**
   * Perform a login operation.
   *
   * @param dto - data transfer object containing username/password
   * @param ip  - IP address of the client (provided by controller)
   * @returns whatever the PL/SQL function returns (often a token or status code)
   */
  async login(dto: LoginDto, ip: string): Promise<any> {
    // We construct a PL/SQL anonymous block that calls the package function.
    // The ':ret' bind is the return value, the rest correspond to parameters.
    const sql = 'BEGIN :ret := FIDZULU.Auth_Pkg.login(:username, :password, :ip); END;';

    // Binds object maps JS values to Oracle bind variables. Notice that 'ret'
    // is an OUT parameter so we declare direction and type.
    const binds = {
      ret: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      username: dto.username,
      password: dto.password,
      ip,
    } as any;

    // Execute the statement and return the output bind value. Using the
    // connection directly keeps this service thin and focused.
    const result = await this.conn.execute(sql, binds);
    return result.outBinds?.ret;
  }
}
