import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ok } from '../common/response.util';

class SearchUsersQuery {
  @IsString()
  @MinLength(1)
  q!: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async search(@Query() query: SearchUsersQuery, @CurrentUser() user: JwtPayload) {
    const data = await this.usersService.search(query.q, user.sub);
    return ok('Users retrieved successfully', data);
  }
}
