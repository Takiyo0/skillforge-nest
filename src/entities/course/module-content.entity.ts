import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Unit } from './unit.entity';

export enum ContentKind {
  VIDEO = 'video',
  ARTICLE_MARKDOWN = 'article_markdown',
}

@Entity('module_contents')
export class ModuleContent {
  @PrimaryColumn({ type: 'uuid', name: 'unit_id' })
  unitId: string;

  @Column({
    type: 'enum',
    enum: ContentKind,
    name: 'content_kind',
  })
  contentKind: ContentKind;

  @Column({ type: 'text', nullable: true, name: 'video_url' })
  videoUrl: string;

  @Column({ type: 'text', nullable: true, name: 'article_markdown' })
  articleMarkdown: string;

  @Column({ type: 'text', nullable: true, name: 'subtitle_s3_key' })
  subtitleS3Key: string;

  @Column({ type: 'jsonb', default: [1.0, 1.25, 1.5], name: 'playback_speeds' })
  playbackSpeeds: number[];

  @Column({ type: 'boolean', default: true, name: 'supports_pip' })
  supportsPip: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;
}
