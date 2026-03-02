import { Body, Controller, Ip, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LogoutDto } from './dto/logout.dto';
import { ValidateDto } from './dto/validate.dto';

// Controller is responsible for accepting HTTP requests and delegating
// to the appropriate service methods. It should not contain business logic.

@ApiTags('auth') // Swagger grouping
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * POST /auth/login
     *
     * The @Body decorator tells Nest to parse the JSON body into LoginDto.
     * The @Ip decorator extracts the remote IP address of the request and
     * passes it along to the service, which needs it for auditing/login checks.
     */
    @Post('login')
    @ApiOperation({ summary: 'Authenticate user' })
    @ApiResponse({ status: 201, description: 'Authentication result' })
    async login(@Body() dto: LoginDto, @Ip() ip: string) {
      // simply forward the data to AuthService; controller remains thin.
        return this.authService.login(dto, ip);
    }

    // REGISTER METHOD
    @Post('register')
    @ApiOperation({ summary: 'Register new user' })
    @ApiResponse({ status: 201, description: 'Registration result' })
    async register(@Body() dto: RegisterDto){
        return this.authService.register(dto);
    }

    // LOGOUT METHOD
    @Post('logout')
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'Logout result' })
    async logout(@Body() dto: LogoutDto){
        return this.authService.logout(dto);
    }

    // VALIDATE TOKEN METHOD
    @Post('validate')
    @ApiOperation({ summary: 'Validate authentication token' })
    @ApiResponse({ status: 200, description: 'New token issued, old token invalidated' })
    async validate(@Body() dto: ValidateDto) {
        return this.authService.validate(dto);
    }


}