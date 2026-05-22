import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if the application is running and healthy',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy and running',
    schema: {
      example: {
        message: 'Welcome to SkillForge API',
      },
    },
  })
  getHello(): object {
    return this.appService.getHello();
  }
}
