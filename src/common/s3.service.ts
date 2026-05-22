import {Injectable, Logger} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
    S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import {
    getErrorMessage,
    mapToUpstreamException,
} from './runtime-exception.helper';

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

      const s3Config: S3ClientConfig = {
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
        mapToUpstreamException(error, 'S3 storage', 'uploading a file');
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
        mapToUpstreamException(
            error,
            'S3 storage',
            'generating a signed download URL',
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
        mapToUpstreamException(
            error,
            'S3 storage',
            'generating a signed upload URL',
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
        mapToUpstreamException(error, 'S3 storage', 'deleting a file');
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
        if (error instanceof Error && error.name === 'NoSuchKey') {
        return false;
      }
        mapToUpstreamException(error, 'S3 storage', 'checking file existence');
    }
  }

  getPublicUrl(key: string): string {
    const publicEndpoint = this.configService.get<string>('AWS_S3_PUBLIC_URL');
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    if (publicEndpoint) {
      return `${publicEndpoint}/${key}`;
    }
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
          details.push(`✗ Bucket access failed: ${getErrorMessage(error)}`);
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
              details.push(`✗ Read permission failed: ${getErrorMessage(error)}`);
          }

          // delete test file
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: this.bucket,
              Key: testKey,
            });
            await this.s3Client.send(deleteCommand);
          } catch (error) {
              details.push(
                  `⚠ Failed to cleanup test file: ${getErrorMessage(error)}`,
              );
          }
        } catch (error) {
            details.push(`✗ Write permission failed: ${getErrorMessage(error)}`);
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
            details.push(`✗ List permission failed: ${getErrorMessage(error)}`);
        }
      }
    } catch (error) {
        details.push(
            `✗ Unexpected error during health check: ${getErrorMessage(error)}`,
        );
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
