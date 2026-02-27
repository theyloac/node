import { ApiProperty } from '@nestjs/swagger';

export class GetUserDto {
  @ApiProperty({ description: 'User id' })
  id: number;

  @ApiProperty({ description: 'Username' })
  username?: string;

  @ApiProperty({ description: 'Display name' })
  displayName?: string;
}
