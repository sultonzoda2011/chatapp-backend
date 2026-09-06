import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  memberIds!: number[];
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

export class UpdateMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

export class AddMemberDto {
  @IsInt()
  userId!: number;
}

export class GetMessagesQuery {
  @IsOptional()
  @IsInt()
  cursor?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
