import { Controller, Post, Body, Get, Patch, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtGuard)
  getProfile(@Request() req) {
    console.log('Getting profile for user:', req.user);
    if (!req.user || !req.user.sub) {
      throw new BadRequestException('User information not found in request');
    }
    return this.authService.getProfile(req.user.sub);
  }

  @Patch('profile')
  @UseGuards(JwtGuard)
  updateProfile(
    @Request() req,
    @Body() data: { name?: string; department?: string; phoneNumber?: string; lineId?: string },
  ) {
    return this.authService.updateProfile(req.user.sub, data);
  }
}
