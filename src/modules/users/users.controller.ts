import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Users endpoint is working', status: 'ok' };
  }

  @Get()
  async listUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id/profile')
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Put(':id/profile')
  async updateUserProfile(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateUserProfile(id, data);
  }
}
