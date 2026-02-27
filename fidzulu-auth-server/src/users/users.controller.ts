import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';

// Controller for user-related endpoints. Currently only exposes a single
// read operation, but the pattern allows easy extension.

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/:id
   *
   * The ParseIntPipe validates and converts the 'id' route parameter into a
   * number. If conversion fails, Nest will return a 400 error automatically.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: 200, description: 'User record' })
  async getUser(@Param('id', ParseIntPipe) id: number) {
    // delegate to the service layer; controller doesn't know about database
    return this.usersService.getUserFromID(id);
  }
}
