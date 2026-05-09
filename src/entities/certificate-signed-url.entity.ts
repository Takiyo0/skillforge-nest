import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Certificate } from './certificate.entity';

@Entity('certificate_signed_urls')
@Index('idx_cert_signed_url_token', ['tokenHash'])
export class CertificateSignedUrl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'certificate_id' })
  certificateId: string;

  @Column({ type: 'varchar', length: 128, unique: true, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt: Date | null;

  @ManyToOne(() => Certificate, (cert) => cert.signedUrls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'certificate_id' })
  certificate: Certificate;
}
