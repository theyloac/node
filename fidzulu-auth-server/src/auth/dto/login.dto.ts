import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Data transfer object used by the login endpoint. Validators ensure that
// incoming requests contain the expected shape and types; Swagger decorators
// provide metadata for automatic documentation.
export class LoginDto {
  @ApiProperty({ example: 'alice', description: 'Username for authentication' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Secret123!', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
