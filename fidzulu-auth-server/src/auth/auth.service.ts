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
    // @Inject tells Nest to inject the Oracle connection that we defined in the provider.
    // ORACLE_CONNECTION is the token we used to register the provider, so Nest knows which dependency to inject here.
    // private readonly conn: Connection is the actual Oracle connection instance that we can use 
    // to execute SQL statements and call PL/SQL procedures only in this class
    constructor(@Inject(ORACLE_CONNECTION) private readonly conn: Connection) {}

    /**
   * Perform a login operation.
   *
   * @param dto - data transfer object containing username/password
   * @param ip  - IP address of the client (provided by controller)
   * @returns whatever the PL/SQL function returns (often a token or status code)
   */
    async login(dto: LoginDto, ip: string): Promise<any> {
        // This is an anonymous PL/SQL block that calls the login_user procedure in the auth_pkg package.
        // Avoiding SQL injection is crucial, so we use bind variables (the :param syntax) instead of string concatenation.
        const sql = `BEGIN
        :token :=auth_pkg.login_user(
            p_email => :email,
            p_password => :password,
            p_ip => :ip,
            p_user_id => :userId,
            p_role => :role);
            END;`;


        // Bind is how we pass parameters to the PL/SQL block. We specify the direction (IN/OUT) and type for each parameter.
        const binds = {
            email : dto.email,
            password : dto.password,
            ip: ip,
            token: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
            userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            role: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
        } as any; // 'as any' is used to satisfy TypeScript since the shape of binds is dynamic based on the PL/SQL procedure signature.
    
        // Execute the PL/SQL block with the provided SQL and binds. The result will contain the OUT parameters after execution.
        const result = await this.conn.execute(sql, binds);
        return {
            token: result.outBinds?.token,
            user_id: result.outBinds?.userId,
            role: result.outBinds?.role
        }
    }
}
