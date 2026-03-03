import { Inject, Injectable } from '@nestjs/common';
import oracledb from 'oracledb'; // FIX 1: Use default import
import { Connection } from 'oracledb';
import { ORACLE_CONNECTION } from '../providers/oracle/oracle.provider';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LogoutDto } from './dto/logout.dto';
import { ValidateDto } from './dto/validate.dto';
import { VerifyDto } from './dto/verify.dto';
import { handleOracleError } from '../common/oracle-error.helper';

// AuthService encapsulates the business logic related to authentication.
// It is responsible for talking to the database layer (via an Oracle
// connection) and invoking the stored procedures in the auth_pkg package.

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
            :token := SYSTEM.auth_pkg.login_user(
                p_email => :email,
                p_password => :password,
                p_ip => :ip,
                p_user_id => :userId,
                p_role => :role
            );
        END;`;

        // Bind is how we pass parameters to the PL/SQL block. We specify the direction (IN/OUT) and type for each parameter.

            const binds = {
                email:    { val: dto.email,    type: oracledb.STRING },
                password: { val: dto.password, type: oracledb.STRING },
                ip:       { val: ip,           type: oracledb.STRING },
                token:    { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
                userId:   { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                // FIX 2: Added maxSize for OUT string
                role:     { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }, 
            } as any;

        
    
        // Execute the PL/SQL block with the provided SQL and binds. The result will contain the OUT parameters after execution.
        try {
            const result = await this.conn.execute(sql, binds);
            await this.conn.commit(); // Commit the transaction after successful login
            return {
                token: result.outBinds?.token,
                userId: result.outBinds?.userId,
                role: result.outBinds?.role
            };
        } catch (error) {
            handleOracleError(error); // Centralized error handling for Oracle errors
        }
    }

    // REGISTER METHOD
    async register(dto: RegisterDto): Promise<any> {
        const sql = `BEGIN
            :userId := SYSTEM.auth_pkg.register_user(
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

        try {
            const result = await this.conn.execute(sql, binds);
            await this.conn.commit(); // Commit the transaction after successful registration
            return {
                userId: result.outBinds?.userId
            };
        } catch (error) {
            handleOracleError(error); // Centralized error handling for Oracle errors
        }
    }

    // LOGOUT METHOD
    async logout(dto: LogoutDto): Promise<any> {
        const sql = `BEGIN
            SYSTEM.auth_pkg.logout(
                p_token => :token
            );
        END;`;

        const binds = {
            token: dto.token
        } as any;

        try {
            await this.conn.execute(sql, binds);
            await this.conn.commit(); // Commit the transaction after successful logout
        } catch (error) {
            handleOracleError(error); // Centralized error handling for Oracle errors
        }
    }

    // VALIDATE TOKEN METHOD
    async validate(dt: ValidateDto): Promise<any> {
        const sql = `BEGIN
            :newToken := SYSTEM.auth_pkg.refresh_token(
                p_old_token => :token
            );
        END;`;

        const binds = {
            token: dt.token,
            // the return type contain token + user_id
            newToken: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
        } as any;

        try {
            const result = await this.conn.execute(sql, binds);
            await this.conn.commit(); // Commit the transaction after successful token validation
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
        } catch (error) {
            handleOracleError(error); // Centralized error handling for Oracle errors
        }
    }

    // VERIFY TOKEN METHOD
    async verify(dto: VerifyDto): Promise<any> {
        // WHY IF/THEN: Oracle BOOLEAN cannot be bound directly to a host variable
        // we convert it to a NUMBER (1=true, 0=false) that the driver understands
        const sql = `BEGIN
            IF auth_pkg.verify_token(
                p_token          => :token,
                p_event          => :event,
                p_user_id        => :userId,
                p_role           => :role,
                p_ses_expiredate => :sesExpireDate
            ) THEN
                :isValid := 1;
            ELSE
                :isValid := 0;
            END IF;
        END;`;

        // Bind the input parameter and define the shape and direction of all OUT parameters.
        // Since Oracle BOOLEAN maps to NUMBER (1=true, 0=false), we bind isValid as a NUMBER type.
        const binds = {
            token: dto.token,
            // The PL/SQL BOOLEAN return value is captured as a NUMBER (1 = true, 0 = false)
            isValid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            // FIX 3: Added maxSize for OUT strings
            event: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
            userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            role: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
            sesExpireDate: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        } as any;

        // Execute the PL/SQL block and extract the OUT parameters.
        try {
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
        catch (error) {
            handleOracleError(error); // Centralized error handling for Oracle errors
        }
    }
}