import { ApiProperty } from '@nestjs/swagger';

export class GetUserDto {
    @ApiProperty({ description: 'First name of the user' })
    firstname: string;

    @ApiProperty({ description: 'Last name of the user' })
    lastname: string;

    @ApiProperty({ description: 'Username' })
    username: string;

    @ApiProperty({ description: 'Email address' })
    email: string;

    @ApiProperty({ description: 'User role e.g. USER, ADMIN, GUEST' })
    role: string;
}
