import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ForumPost,
  ForumReply,
  ForumModerationAction,
  Course,
} from '../entities';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumPost,
      ForumReply,
      ForumModerationAction,
      Course,
    ]),
  ],
  providers: [ForumService],
  controllers: [ForumController],
  exports: [ForumService],
})
export class ForumModule {}
