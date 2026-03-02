import {Test, TestingModule} from '@nestjs/testing';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import { mock } from 'node:test';


// This is a test suite for the AuthController. It uses Jest and Nest's testing utilities

describe('AuthController', () => {
    let controller: AuthController;
    let mockAuthService: any;

    // before each test, we create a testing module and provide a mock AuthService
    beforeEach(async () => {
        // mock the AuthService so we don't need a real database
        mockAuthService = {
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            validate: jest.fn(),
        };

        // create the testing module and inject the AuthController with the mocked AuthService
        const module: TestingModule = await Test.createTestingModule({
            // providers are the services that the controller depends on; we override AuthService with our mock
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService, // use the mocked service
                },
            ],
        }).compile(); // .compile() finalizes the module and makes it ready for testing

        // get an instance of the AuthController from the testing module
        controller = module.get<AuthController>(AuthController);
    });

    // Testing the login method of the controller
    describe('login', () => {
        it('should return a token, user_id, and role on successful login', async () => {
            // arrange: set up the input and mock behavior on shared mockAuthService
            mockAuthService.login.mockResolvedValue({
                token: 'fake-token',
                userId: 123,
                role: 'user',
            });

            // act: call the login method with a sample DTO and IP
            const result = await controller.login({
                email: 'john@example.com',
                password: 'password123'
            });
            // assert: check that the result matches what we expect
            expect(result).toEqual({
                token: 'fake-token',
                userId: 123,
                role: 'user',
            });
        });
    });

    // Testing the register method of the controller
    describe('register', () => {
        it('should return a userId on successful registration', async () => {
            // arrange: set up the input and mock behavior on shared mockAuthService
            const expected = { userId: 123 };
            mockAuthService.register.mockResolvedValue(expected);

            // act: call the register method with a sample DTO
            const result = await controller.register({
                email: 'john@example.com',
                password: 'password123',
                firstname: 'John',
                lastname: 'Doe',
                username: 'johndoe'
            });
            // assert: check that the result matches what we expect and that the service method was called once
            expect(result).toBe(expected);
            expect(mockAuthService.register).toHaveBeenCalledTimes(1);
        });
    });


    // Testing the logout method
    describe('logout', () => {
        it('should call the logout method of AuthService with the correct token', async () => {
            //arrange
            mockAuthService.logout.mockResolvedValue({ message: 'Logged out successfully' });

            // act
            await controller.logout({token: 'fake-token'});

            // assert: check that the service method was called with the correct token
            expect(mockAuthService.logout).toHaveBeenCalledWith({ token: 'fake-token' });
            expect(mockAuthService.logout).toHaveBeenCalledTimes(1);

        });
    });

    // Testing the validate method
    describe('validate', () => {
        it('should call the validate method of AuthService with the correct token', async () => {
            // arrange
            const expected = { token: 'new-fake-token', user_id: 123 };
            mockAuthService.validate.mockResolvedValue(expected);

            // act
            const result = await controller.validate({ token: 'old-fake-token' });

            // assert: check that the service method was called with the correct token and that the result matches what we expect
            expect(mockAuthService.validate).toHaveBeenCalledWith({ token: 'old-fake-token' });
            expect(result).toBe(expected);
            expect(mockAuthService.validate).toHaveBeenCalledTimes(1);
        });
    });


});