import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LogoutDto {
    @ApiProperty({ example:'edDdsHUs', description: 'The token to invalidate' })
    @IsNotEmpty()
    @IsString()
    token: string;
}