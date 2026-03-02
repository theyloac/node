import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class VerifyDto {
    @ApiProperty({ example: 'eDsdsafE', description: 'The authentication token to validate' })
    @IsNotEmpty()
    @IsString()
    token: string;
}