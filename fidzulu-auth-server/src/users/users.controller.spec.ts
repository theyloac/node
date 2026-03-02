import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    let mockUsersService: any;

    beforeEach(async () => {
    mockUsersService = {
        getUserFromID: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
            {
            provide: UsersService,
            useValue: mockUsersService,
            },
        ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    });

    describe('getUser', () => {
        it('should call usersService.getUserFromID with correct id', async () => {
        // arrange
        const expected = {
            firstName: 'John',
            lastName:  'Doe',
            username:  'johndoe',
            email:     'john@example.com',
            role:      'USER',
        };
        
        mockUsersService.getUserFromID.mockResolvedValue(expected);

        // act
        const result = await controller.getUser(1);

        // assert
        expect(result).toBe(expected);
        expect(mockUsersService.getUserFromID).toHaveBeenCalledWith(1);
        expect(mockUsersService.getUserFromID).toHaveBeenCalledTimes(1);
    });
    });
});