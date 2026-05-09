import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCoursesToPathDto {
  @ApiProperty({
    description: 'Array of course IDs to add to the learning path',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  courseIds: string[];
}
