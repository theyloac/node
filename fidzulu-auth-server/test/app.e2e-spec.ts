import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ORACLE_CONNECTION } from './../src/providers/oracle/oracle.provider';

describe('Auth Server (e2e)', () => {
    let app: INestApplication<App>;
    let mockConn: any;

    beforeEach(async () => {
        // mock Oracle connection at app level
        // WHY: E2E tests boot the real app but we don't want a real DB connection
        mockConn = {
            execute: jest.fn(),
            commit:  jest.fn(),
        };

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideProvider(ORACLE_CONNECTION)
        .useValue(mockConn)
        .compile();

        app = moduleFixture.createNestApplication();

        // WHY: must match main.ts setup so routes and validation work the same
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new ValidationPipe());

        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    // APP
    describe('GET /api/v1', () => {
        it('should return Hello World', () => {
            return request(app.getHttpServer())
                .get('/api/v1')
                .expect(200)
                .expect('Hello World!');
        });
    });

    // LOGIN
    describe('POST /api/v1/auth/login', () => {
        it('should return token, userId and role on success', async () => {
            mockConn.execute.mockResolvedValue({
                outBinds: { token: 'fake-jwt', userId: 1, role: 'USER' },
            });

            return request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: 'john@example.com', password: 'Secret123!' })
                .expect(201)
                .expect((res) => {
                    expect(res.body.token).toBe('fake-jwt');
                    expect(res.body.userId).toBe(1);
                    expect(res.body.role).toBe('USER');
                });
        });
    });

    // REGISTER
    describe('POST /api/v1/auth/register', () => {
        it('should return userId on success', async () => {
            mockConn.execute.mockResolvedValue({
                outBinds: { userId: 42 },
            });

            return request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    firstname: 'John',
                    lastname:  'Doe',
                    username:  'johndoe',
                    email:     'john@example.com',
                    password:  'Secret123!',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body.userId).toBe(42);
                });
        });
    });

    // LOGOUT
    describe('POST /api/v1/auth/logout', () => {
        it('should return 200 on success', async () => {
            mockConn.execute.mockResolvedValue({});

            return request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .send({ token: 'fake-jwt' })
                .expect(200);
        });
    });

    // VALIDATE
    describe('POST /api/v1/auth/validate', () => {
        it('should return new token and user_id on success', async () => {
            mockConn.execute.mockResolvedValue({
                outBinds: { newToken: 'new-fake-jwt,USER_ID=1' },
            });

            return request(app.getHttpServer())
                .post('/api/v1/auth/validate')
                .send({ token: 'old-fake-jwt' })
                .expect(201)
                .expect((res) => {
                    expect(res.body.token).toBe('new-fake-jwt');
                    expect(res.body.user_id).toBe(1);
                });
        });
    });

    // VERIFY
    describe('POST /api/v1/auth/verify', () => {
        it('should return isValid true for a valid token', async () => {
            mockConn.execute.mockResolvedValue({
                outBinds: {
                    isValid:       1,
                    event:         'LOGIN',
                    userId:        1,
                    role:          'USER',
                    sesExpireDate: 9999999999,
                },
            });

            return request(app.getHttpServer())
                .post('/api/v1/auth/verify')
                .send({ token: 'fake-jwt' })
                .expect(201)
                .expect((res) => {
                    expect(res.body.isValid).toBe(true);
                    expect(res.body.role).toBe('USER');
                });
        });
    });

    // GET USER
    describe('GET /api/v1/users/:id', () => {
        it('should return user details for a valid id', async () => {
            mockConn.execute.mockResolvedValue({
                outBinds: {
                    firstname: 'John',
                    lastname:  'Doe',
                    username:  'johndoe',
                    email:     'john@example.com',
                    role:      'USER',
                },
            });

            return request(app.getHttpServer())
                .get('/api/v1/users/1')
                .expect(200)
                .expect((res) => {
                    expect(res.body.firstname).toBe('John');
                    expect(res.body.username).toBe('johndoe');
                });
        });
    });
});