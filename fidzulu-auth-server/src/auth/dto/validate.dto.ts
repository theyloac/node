import {ApiProperty} from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateDto{
    @ApiProperty({ example: 'eyDsDMicM', description: 'Token to validate and refresh' })
    @IsString()
    @IsNotEmpty()
    token: string;
}