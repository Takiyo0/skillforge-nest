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

export enum VerificationResult {
  VALID = 'valid',
  INVALID = 'invalid',
  EXPIRED = 'expired',
  NOT_FOUND = 'not_found',
  REVOKED = 'revoked',
}

@Entity('certificate_verification_logs')
@Index('idx_cert_verify_logs_requested_at', ['requestedAt'])
@Index('idx_cert_verify_logs_code', ['verificationCode'])
export class CertificateVerificationLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'uuid', nullable: true, name: 'certificate_id' })
  certificateId: string | null;

  @Column({
    type: 'varchar',
    length: 96,
    nullable: true,
    name: 'verification_code',
  })
  verificationCode: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'token_hash' })
  tokenHash: string | null;

  @Column({ type: 'varchar', length: 50 })
  result: VerificationResult;

  @Column({ type: 'inet', nullable: true, name: 'request_ip' })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ type: 'boolean', nullable: true, name: 'signature_valid' })
  signatureValid: boolean | null;

  @ManyToOne(() => Certificate, (cert) => cert.verificationLogs, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'certificate_id' })
  certificate: Certificate;
}
