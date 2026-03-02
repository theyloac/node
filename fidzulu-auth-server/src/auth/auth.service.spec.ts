import {Test, TestingModule} from '@nestjs/testing';
import * as oracledb from 'oracledb';
import {AuthService} from './auth.service';
import { ORACLE_CONNECTION } from '../providers/oracle/oracle.provider';

// This is a test suite for the AuthService. It uses Jest and Nest's testing utilities
describe('AuthService', () => {
    let service: AuthService;
    let mockConn: any;

    // before each test, we create a testing module and provide a mock Oracle connection
    beforeEach(async () => {
        // mock the oracle connection (stored in outer scope so tests can modify it)
        mockConn = {
            execute: jest.fn(),
        };

        // create the testing module and inject the AuthService with the mocked Oracle connection
        const module: TestingModule = await Test.createTestingModule({
            // we provide the AuthService and override the ORACLE_CONNECTION with our mock
            providers: [
                AuthService,
                {
                    provide: ORACLE_CONNECTION,
                    useValue: mockConn, // use the mocked connection
                },
            ],
        }).compile(); // .compile() finalizes the module and makes it ready for testing

        // get an instance of the AuthService from the testing module
        service = module.get<AuthService>(AuthService);
    });

    describe('login', () => {
        it('should return a token, user_id, and role on successful login', async () => {
            // arrange: set up the input and mock behavior on shared mockConn
            mockConn.execute.mockResolvedValue({
                outBinds: { token: 'fake-token', userId: 123, role: 'user' },
            });

            // act: call the login method with a sample DTO and IP
            const result = await service.login({ email: 'john@example.com', password: 'password123' }, 
                                                '192.168.1.1');
            
            // assert: verify that the result matches the expected output
            expect(result.token).toBe('fake-token');
            expect(result.userId).toBe(123);
            expect(result.role).toBe('user');

            // confirm that execute was called with correctly-formed binds
            expect(mockConn.execute).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    email:    'john@example.com',
                    password: 'password123',
                    ip:       { val: '192.168.1.1', type: oracledb.STRING },
                    token:    expect.objectContaining({ maxSize: 4000 })
                })
            );
        });
    });

    // Testing the register
    describe('register', () => {
        it('should return a userId on successful registration', async () => {
            // arrange: set up the input and mock behavior on shared mockConn
            mockConn.execute.mockResolvedValue({
                outBinds: { userId: 123 },
            });

            // act: call the register method with a sample DTO
            const result = await service.register({ 
                email: 'john@example.com', 
                password: 'password123',
                firstname: 'John',
                lastname: 'Doe',
                username: 'johndoe'
            });

            // assert: verify that the result matches the expected output
            expect(result.userId).toBe(123);
        });
    });

    // Testing the logout
    describe('logout', () => {
        it('should execute the logout procedure with the provided token', async () => {
            // arrange: set up the input and mock behavior on shared mockConn
            mockConn.execute.mockResolvedValue({});
        
            // act: call the logout method with a sample DTO
            await service.logout({ token: 'fake-token' });

            // assert
            expect(mockConn.execute).toHaveBeenCalledWith(
                expect.stringContaining('auth_pkg.logout_user'),
                expect.objectContaining({ token: 'fake-token' })
            );
            expect(mockConn.execute).toHaveBeenCalledTimes(1);
        });
    });

    // Testing the validate method
    describe('validate', () => {
        it('should return a new token and user_id on successful validation', async () => {
            // arrange: set up the input and mock behavior on shared mockConn
            mockConn.execute.mockResolvedValue({
                outBinds: { newToken: 'new-fake-token,USER_ID=123' },
            });

            // act
            const result = await service.validate({ token: 'old-fake-token' });

            // assert
            expect(result.token).toBe('new-fake-token');
            expect(result.user_id).toBe(123);
        });
    });

    // Testing the verify method
    describe('verify', () => {
        it('should return verification details when token is valid', async () => {
            // arrange
            mockConn.execute.mockResolvedValue({
                outBinds: {
                    isValid: 1, // numeric boolean from PL/SQL (1 = true)
                    event: 'LOGIN',
                    userId: 123,
                    role: 'user',
                    sesExpireDate: 999999,
                },
            });

            // act
            const result = await service.verify({ token: 'check-token' });

            // assert
            expect(result.isValid).toBe(true);
            expect(result.event).toBe('LOGIN');
            expect(result.userId).toBe(123);
            expect(result.role).toBe('user');
            expect(result.sesExpireDate).toBe(999999);
        });
    });
});