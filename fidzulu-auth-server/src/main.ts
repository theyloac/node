import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe()); // enables class-validator decorators on DTOs
    app.setGlobalPrefix('api/v1');            // adds /api/v1 prefix to all routes

    // WHY swagger: auto-generates interactive API docs from our decorators
    // accessible at http://localhost:3000/api/docs once the app is running
    const config = new DocumentBuilder()
        .setTitle('FidZulu Auth Server')
        .setDescription('Authentication API for FidZulu e-commerce')
        .setVersion('1.0')
        .addBearerAuth()  // adds Authorization header support in Swagger UI
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();