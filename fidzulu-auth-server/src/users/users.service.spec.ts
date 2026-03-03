import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { ORACLE_CONNECTION } from '../providers/oracle/oracle.provider';

describe('UsersService', () => {
  let service: UsersService;
  let mockConn: any;

  beforeEach(async () => {
    mockConn = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: ORACLE_CONNECTION,
          useValue: mockConn,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getUserFromID', () => {
    it('should return user details for a valid id', async () => {
      // arrange
      mockConn.execute.mockResolvedValue({
        outBinds: {
          firstname: 'John',
          lastname:  'Doe',
          username:  'johndoe',
          email:     'john@example.com',
          role:      'USER',
        },
      });

      // act
      const result = await service.getUserFromID(1);

      // assert
      expect(result.firstname).toBe('John');
      expect(result.lastname).toBe('Doe');
      expect(result.username).toBe('johndoe');
      expect(result.email).toBe('john@example.com');
      expect(result.role).toBe('USER');
      expect(mockConn.execute).toHaveBeenCalledTimes(1);
    });
  });
});