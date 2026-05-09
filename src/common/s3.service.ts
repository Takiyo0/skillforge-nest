import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');

    if (!accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('AWS S3 credentials not configured');
    }

    this.bucket = bucket;

    const s3Config: any = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    };

    if (endpoint) {
      s3Config.endpoint = endpoint;
      // MinIO and some S3-compatible services need forcePathStyle
      s3Config.forcePathStyle = true;
    }

    this.s3Client = new S3Client(s3Config);
  }

  async uploadFile(
    fileBuffer: Buffer,
    contentType: string,
    folder: string,
    fileName?: string,
  ): Promise<string> {
    try {
      const key = `${folder}/${fileName || uuidv4()}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      return key;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file to S3: ${error.message}`,
      );
    }
  }

  async getSignedDownloadUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
      return signedUrl;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${error.message}`,
      );
    }
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
      return signedUrl;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate signed upload URL: ${error.message}`,
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file from S3: ${error.message}`,
      );
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw new InternalServerErrorException(
        `Failed to check file existence: ${error.message}`,
      );
    }
  }

  getPublicUrl(key: string): string {
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    if (endpoint) {
      return `${endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    checks: { [key: string]: boolean };
    details: string;
  }> {
    const checks = {
      bucketAccess: false,
      writePermission: false,
      readPermission: false,
      listPermission: false,
    };

    const details: string[] = [];

    try {
      // check 1: Bucket exists and is accessible
      try {
        const headCommand = new HeadBucketCommand({ Bucket: this.bucket });
        await this.s3Client.send(headCommand);
        checks.bucketAccess = true;
        details.push(`✓ Bucket access verified (${this.bucket})`);
      } catch (error) {
        details.push(`✗ Bucket access failed: ${error.message}`);
      }

      // check 2: Write permission (upload test file)
      if (checks.bucketAccess) {
        try {
          const testKey = `.health-check/${uuidv4()}.txt`;
          const putCommand = new PutObjectCommand({
            Bucket: this.bucket,
            Key: testKey,
            Body: Buffer.from('health check test file'),
            ContentType: 'text/plain',
          });
          await this.s3Client.send(putCommand);
          checks.writePermission = true;
          details.push(`✓ Write permission verified (${testKey})`);

          // check 3: Read permission (download test file)
          try {
            const getCommand = new GetObjectCommand({
              Bucket: this.bucket,
              Key: testKey,
            });
            await this.s3Client.send(getCommand);
            checks.readPermission = true;
            details.push(`✓ Read permission verified`);
          } catch (error) {
            details.push(`✗ Read permission failed: ${error.message}`);
          }

          // delete test file
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: testKey,
            });
            await this.s3Client.send(deleteCommand);
          } catch (error) {
            details.push(`⚠ Failed to cleanup test file: ${error.message}`);
          }
        } catch (error) {
          details.push(`✗ Write permission failed: ${error.message}`);
        }
      }

      // check 4: List permission
      if (checks.bucketAccess) {
        try {
          const listCommand = new ListObjectsV2Command({
            Bucket: this.bucket,
            MaxKeys: 1,
          });
          await this.s3Client.send(listCommand);
          checks.listPermission = true;
          details.push(`✓ List permission verified`);
        } catch (error) {
          details.push(`✗ List permission failed: ${error.message}`);
        }
      }
    } catch (error) {
      details.push(`✗ Unexpected error during health check: ${error.message}`);
    }

    const healthy = Object.values(checks).every((check) => check);
    const detailsString = details.join(' | ');

    if (healthy) {
      this.logger.log(`S3 Health Check PASSED: ${detailsString}`);
    } else {
      this.logger.warn(`S3 Health Check FAILED: ${detailsString}`);
    }

    return {
      healthy,
      checks,
      details: detailsString,
    };
  }
}
