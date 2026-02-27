import { ConfigService } from '@nestjs/config';
import { getConnection } from 'oracledb';

import { oracleProvider } from './oracle.provider';

// mock oracledb module so we can intercept getConnection calls
jest.mock('oracledb', () => ({
  getConnection: jest.fn(),
}));

// Groups of tests for the oracleProvider
describe('oracleProvider', () => {
    // give a fake ConfigService for testing, with a mocked get method
  let config: Partial<ConfigService>;

  // reset mocks before each test
  beforeEach(() => {
    config = {
      get: jest.fn(),
    } as any;
    (getConnection as jest.Mock).mockReset();
  });


  // Test that a connection is returned when all required configuration values are provided
  it('returns a connection when configuration values are provided', async () => {
    (config.get as jest.Mock)
      .mockImplementation((key: string) => {
        switch (key) {
          case 'DB_USER':
            return 'user';
          case 'DB_PASS':
            return 'password';
          case 'DB_CONNECT_STRING':
            return 'connectString';
          default:
            return undefined;
        }
      });

    const fakeConn = {} as any;
    (getConnection as jest.Mock).mockResolvedValue(fakeConn);

    const result = await oracleProvider.useFactory(config as ConfigService);
    expect(result).toBe(fakeConn);
    expect(getConnection).toHaveBeenCalledWith({
      user: 'user',
      password: 'password',
      connectString: 'connectString',
    });
  });

  // return a connection when all required configuration values are provided using ORACLE_* keys instead of DB_*
  it('prefers DB_* values over ORACLE_* when both exist', async () => {
    (config.get as jest.Mock)
      .mockImplementation((key: string) => { // simulates our .env file
        const values: Record<string, string> = {
          ORACLE_USER: 'oracleUser',
          ORACLE_PASSWORD: 'oraclePass',
          ORACLE_CONNECTION_STRING: 'oracleConnect',
          DB_USER: 'dbUser',
          DB_PASS: 'dbPass',
          DB_CONNECT_STRING: 'dbConnect',
        };
        return values[key];
      });

    // simulate a successful connection
    const fakeConn = {} as any; 
    (getConnection as jest.Mock).mockResolvedValue(fakeConn);

    // call the provider factory and verify it returns the connection and uses DB_* values
    const result = await oracleProvider.useFactory(config as ConfigService);
    expect(result).toBe(fakeConn);
    expect(getConnection).toHaveBeenCalledWith({
      user: 'dbUser',
      password: 'dbPass',
      connectString: 'dbConnect',
    });
  });

  // Test that an error is thrown if any required configuration value is missing
  it('throws an error if any required configuration is missing', async () => {
    // simulate missing values
    (config.get as jest.Mock).mockReturnValue(undefined);

    await expect(
      oracleProvider.useFactory(config as ConfigService),
    ).rejects.toThrow('Oracle configuration is incomplete');
  });
});
