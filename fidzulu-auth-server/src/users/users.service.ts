import { Inject, Injectable } from '@nestjs/common';
import oracledb, { Connection } from 'oracledb';
import { ORACLE_CONNECTION } from '../providers/oracle/oracle.provider';
import { handleOracleError } from '../common/oracle-error.helper';

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
    console.log('id received:', id, typeof id);
    
    const sql = `
        BEGIN
            auth_pkg.getUserFromID(
                p_user_id   => :id,
                p_firstname => :firstname,
                p_lastname  => :lastname,
                p_username  => :username,
                p_email     => :email,
                p_role      => :role
            );
        END;
    `;

    const binds: any = {
        id:        { val: id, type: oracledb.NUMBER },
        firstname: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
        lastname:  { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
        username:  { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
        email:     { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
        role:      { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 50 },
    };

    console.log('binds:', JSON.stringify(binds));
    console.log('BIND_OUT value:', oracledb.BIND_OUT);
    console.log('STRING value:', oracledb.STRING);
    console.log('NUMBER value:', oracledb.NUMBER);

    try {
        const result = await this.conn.execute(sql, binds);
        return {
            firstname: result.outBinds?.firstname,
            lastname:  result.outBinds?.lastname,
            username:  result.outBinds?.username,
            email:     result.outBinds?.email,
            role:      result.outBinds?.role,
        };
    } catch (error) {
        console.log('Error message:', error?.message);
        handleOracleError(error);
    }
}
}
