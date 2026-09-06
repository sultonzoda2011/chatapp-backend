import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { UploadedImageFile } from '../common/uploaded-file';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { ok } from '../common/response.util';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return ok('User registered successfully', data);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return ok('Login successful', data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.getProfile(user.sub);
    return ok('Profile retrieved successfully', data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    const data = await this.authService.updateProfile(user.sub, dto);
    return ok('Profile updated successfully', data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('profile/change-password')
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.sub, dto);
    return ok('Password updated successfully');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file?: UploadedImageFile) {
    this.assertImage(file);
    const data = await this.authService.uploadAvatar(user.sub, file);
    return ok('Avatar uploaded successfully', data);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('profile/avatar')
  async removeAvatar(@CurrentUser() user: JwtPayload) {
    const data = await this.authService.removeAvatar(user.sub);
    return ok('Avatar removed successfully', data);
  }

  private assertImage(file?: UploadedImageFile): asserts file is UploadedImageFile {
    if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      throw new BadRequestException('A JPEG, PNG, WEBP or GIF image is required');
    }
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Image must be 5 MB or smaller');
  }
}
