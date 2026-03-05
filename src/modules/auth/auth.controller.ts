import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Auth endpoint is working' };
  }

  @Post('sign-up')
  async signUp(@Body() dto: SignUpDto) {
    console.log('Sign up request received:', dto);
    try {
      const result = await this.authService.signUp(dto);
      console.log('Sign up successful:', result);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  @Post('admin/create')
  async createAdmin(@Body() dto: SignUpDto) {
    console.log('Admin creation request received:', dto);
    try {
      const result = await this.authService.createAdmin(dto);
      console.log('Admin created successfully:', result);
      return result;
    } catch (error) {
      console.error('Admin creation error:', error);
      throw error;
    }
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }
}
