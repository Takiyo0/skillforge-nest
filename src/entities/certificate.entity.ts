import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course/course.entity';
import { CertificateSignedUrl } from './certificate-signed-url.entity';
import { CertificateVerificationLog } from './certificate-verification-log.entity';

@Entity('certificates')
@Index('idx_certificates_user', ['userId'])
@Index('idx_certificates_course_user', ['courseId', 'userId'])
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    name: 'certificate_code',
  })
  certificateCode: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'course_id' })
  courseId: string;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt: Date;

  @Column({ type: 'jsonb', name: 'completion_snapshot' })
  completionSnapshot: {
    userName: string;
    courseName: string;
    courseLevel: string;
    completedAt: string;
    totalUnits: number;
  };

  @Column({ type: 'text', name: 'qr_payload' })
  qrPayload: string;

  @Column({ type: 'text', nullable: true, name: 'pdf_s3_key' })
  pdfS3Key: string | null;

  @Column({
    type: 'varchar',
    length: 96,
    unique: true,
    name: 'verification_code',
  })
  verificationCode: string;

  @Column({ type: 'boolean', default: false, name: 'is_revoked' })
  isRevoked: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt: Date | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => CertificateSignedUrl, (url) => url.certificate)
  signedUrls: CertificateSignedUrl[];

  @OneToMany(() => CertificateVerificationLog, (log) => log.certificate)
  verificationLogs: CertificateVerificationLog[];
}
