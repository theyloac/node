import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

// Data transfer object used by the registration endpoint. Validators ensure that
// incoming requests contain the expected shape and types; Swagger decorators
// provide metadata for automatic documentation.

export class RegisterDto {
    // Check that the first name is a non-empty string and provide an example for Swagger
    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstname: string;

    // check that the last name is a non-empty string and provide an example for Swagger
    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    lastname: string;

    @ApiProperty({ example: 'johndoe' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Secret 123!' })
    @IsString()
    @MinLength(8)
    password: string;
}