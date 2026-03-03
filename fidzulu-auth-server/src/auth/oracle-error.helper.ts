import { HttpException, HttpStatus } from '@nestjs/common';

// WHY a helper: centralizes Oracle error translation in one place
// so every service method can call it instead of duplicating logic
export function handleOracleError(error: any): never {
    const message = error?.message as string ?? '';
    
    // TEMPORARY: log the full error so we can see what Oracle is returning
    console.log('Oracle error caught:', message);

    // Invalid credentials or user not found
    if (message.includes('ORA-01403') || message.includes('ORA-20100')) {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    // Token expired
    if (message.includes('ORA-20200')) {
        throw new HttpException('Token expired', 498);
    }

    // Invalid token
    if (message.includes('ORA-20201')) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }

    // Registration errors
    if (message.includes('ORA-20008')) {
        throw new HttpException('Username already exists', HttpStatus.CONFLICT);
    }

    if (message.includes('ORA-20009')) {
        throw new HttpException('Email already exists', HttpStatus.CONFLICT);
    }

    // WHY re-throw: if we don't recognize the error, let NestJS handle it
    // but sanitize the message so DB internals are never exposed
    throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
}