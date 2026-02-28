import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1'); // adds /api/v1 prefix to all routes (required)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
