import { Inject, Injectable } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { Connection } from 'oracledb';
import { ORACLE_CONNECTION } from '../providers/oracle/oracle.provider';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LogoutDto } from './dto/logout.dto';
import { ValidateDto } from './dto/validate.dto';
import { VerifyDto } from './dto/verify.dto';

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

    // LOGIN METHOD
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
            userId: result.outBinds?.userId,
            role: result.outBinds?.role
        }
    }

    // REGISTER METHOD
    async register (dto: RegisterDto): Promise<any>{
        const sql = `BEGIN
        :userId := auth_pkg.register_user(
            p_firstname => :firstname,
            p_lastname => :lastname,
            p_username => :username,
            p_email => :email,
            p_password => :password
        );
        END;`;

        const binds = {
            firstname: dto.firstname,
            lastname: dto.lastname,
            username: dto.username,
            email: dto.email,
            password: dto.password,
            userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any;

        const result = await this.conn.execute(sql, binds);
        return {
            userId: result.outBinds?.userId
        };
    }


    // LOGOUT METHOD
    async logout(dto: LogoutDto): Promise<any> {
        const sql = `BEGIN
        auth_pkg.logout_user(
            p_token => :token
        );
        END;`;

        const binds = {
            token: dto.token
        } as any;

        await this.conn.execute(sql, binds);
    }

    // VALIDATE TOKEN METHOD
    async validate(dt: ValidateDto): Promise<any> {
        const sql = `BEGIN
            :newToken := auth_pkg.validate_token(
                p_old_token => :token
            );
        END;`;

        const binds = {
            token: dt.token,
            // the return type contain token + user_id
            newToken: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        } as any;

        const result = await this.conn.execute(sql, binds);
        // the PL/SQL function returns a new token if the old one is valid, or null if it's not. We extract the new token from the OUT binds and return it to the caller.
        const raw = result.outBinds?.newToken as string;

        // the PL/SQL package returns a string like "<token>,USER_ID=<id>";
        // split once and parse the trailing user id
        const [token, userIdPart] = raw.split(',USER_ID=');
        const userIdNumber = parseInt(userIdPart, 10); // Convert userId to a number

        return {
            token,
            user_id: userIdNumber
        };
    }

    // VERIFY TOKEN METHOD
    async verify(dto: VerifyDto): Promise<any> {
        // This PL/SQL block calls the verify_token function from the auth_pkg package.
        // The verify_token function validates a given token and returns a BOOLEAN (1 for true, 0 for false)
        // along with OUT parameters containing the token's metadata (event type, user_id, role, and expiration date).
        const sql = `BEGIN
            :isValid := auth_pkg.verify_token(
                p_token => :token,
                p_event => :event,
                p_user_id => :userId,
                p_role => :role,
                p_ses_expiredate => :sesExpireDate
            );
        END;`;

        // Bind the input parameter and define the shape and direction of all OUT parameters.
        // Since Oracle BOOLEAN maps to NUMBER (1=true, 0=false), we bind isValid as a NUMBER type.
        const binds = {
            token: dto.token,
            // The PL/SQL BOOLEAN return value is captured as a NUMBER (1 = true, 0 = false)
            isValid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            event: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
            userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            role: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
            sesExpireDate: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        } as any;

        // Execute the PL/SQL block and extract the OUT parameters.
        const result = await this.conn.execute(sql, binds);
        
        // Convert the numeric boolean (1/0 from Oracle) to a proper boolean value.
        const isValid = result.outBinds?.isValid === 1;

        return {
            isValid,
            event: result.outBinds?.event,
            userId: result.outBinds?.userId,
            role: result.outBinds?.role,
            sesExpireDate: result.outBinds?.sesExpireDate
        };
    }



}
