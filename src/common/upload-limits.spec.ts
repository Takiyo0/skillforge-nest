import {BadRequestException} from '@nestjs/common';
import {
  assertUploadedFileAllowed,
  imageFileFilter,
  resourceFileFilter,
  videoFileFilter,
} from './upload-limits';

describe('upload-limits file filters', () => {
  const getExceptionMessage = (error: unknown): string => {
    if (!(error instanceof BadRequestException)) {
      throw new Error('Expected BadRequestException');
    }

    return error.message;
  };

  const invokeFilter = (
      filter: (
          req: any,
          file: Express.Multer.File,
          cb: (err: any, acceptFile?: boolean) => void,
      ) => void,
      mimetype: string,
      originalname = 'file.bin',
  ) =>
      new Promise<{ err: unknown; acceptFile?: boolean }>((resolve) => {
        filter(
            {},
            {mimetype, originalname} as Express.Multer.File,
            (err: unknown, acceptFile?: boolean) => resolve({err, acceptFile}),
        );
      });

  it('returns BadRequestException for invalid image file types', async () => {
    const result = await invokeFilter(imageFileFilter, 'video/mp4');

    expect(result.acceptFile).toBe(false);
    expect(result.err).toBeInstanceOf(BadRequestException);
    expect(getExceptionMessage(result.err)).toBe(
        'Invalid image file type. Allowed: jpg, png, gif, webp, heic, heif, avif',
    );
  });

  it('returns BadRequestException for invalid video file types', async () => {
    const result = await invokeFilter(videoFileFilter, 'image/png');

    expect(result.acceptFile).toBe(false);
    expect(result.err).toBeInstanceOf(BadRequestException);
    expect(getExceptionMessage(result.err)).toBe(
        'Invalid video file type. Allowed: mp4, webm, ogg, mov, m4v, 3gp',
    );
  });

  it('returns BadRequestException for invalid resource file types', async () => {
    const result = await invokeFilter(
        resourceFileFilter,
        'application/x-msdownload',
        'malware.exe',
    );

    expect(result.acceptFile).toBe(false);
    expect(result.err).toBeInstanceOf(BadRequestException);
    expect(getExceptionMessage(result.err)).toBe(
        'Invalid resource file type. Allowed: documents, slides, spreadsheets, notebooks, code files, text files, datasets, and archives',
    );
  });

  it('accepts iPhone image MIME types such as HEIC', async () => {
    const result = await invokeFilter(
        imageFileFilter,
        'image/heic',
        'photo.heic',
    );

    expect(result.err).toBeNull();
    expect(result.acceptFile).toBe(true);
  });

  it('accepts iPhone video uploads such as MOV even with generic MIME', async () => {
    const result = await invokeFilter(
        videoFileFilter,
        'application/octet-stream',
        'clip.mov',
    );

    expect(result.err).toBeNull();
    expect(result.acceptFile).toBe(true);
  });

  it('accepts notebook resources by extension when MIME is generic', async () => {
    const result = await invokeFilter(
        resourceFileFilter,
        'application/octet-stream',
        'lesson.ipynb',
    );

    expect(result.err).toBeNull();
    expect(result.acceptFile).toBe(true);
  });

  it('accepts image uploads through the file resource filter', async () => {
    const result = await invokeFilter(
        resourceFileFilter,
        'image/png',
        'diagram.png',
    );

    expect(result.err).toBeNull();
    expect(result.acceptFile).toBe(true);
  });

  it('accepts video uploads through the file resource filter', async () => {
    const result = await invokeFilter(
        resourceFileFilter,
        'video/quicktime',
        'demo.mov',
    );

    expect(result.err).toBeNull();
    expect(result.acceptFile).toBe(true);
  });
});

describe('assertUploadedFileAllowed', () => {
  it('accepts text-based code resources uploaded as text/plain', async () => {
    await expect(
        assertUploadedFileAllowed(
            {
              originalname: 'solution.py',
              mimetype: 'text/plain',
              buffer: Buffer.from('print("hello")\n'),
            } as Express.Multer.File,
            'file',
        ),
    ).resolves.toBeUndefined();
  });

  it('rejects unsupported binary resources even when extension is renamed', async () => {
    await expect(
        assertUploadedFileAllowed(
            {
              originalname: 'malware.pdf',
              mimetype: 'application/pdf',
              buffer: Buffer.from('not-a-real-pdf'),
            } as Express.Multer.File,
            'file',
        ),
    ).rejects.toThrow('Invalid resource file content');
  });

  it('accepts image content when uploaded as file type', async () => {
    await expect(
        assertUploadedFileAllowed(
            {
              originalname: 'diagram.png',
              mimetype: 'image/png',
              buffer: Buffer.from(
                  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5d0000000049454e44ae426082',
                  'hex',
              ),
            } as Express.Multer.File,
            'file',
        ),
    ).resolves.toBeUndefined();
  });

  it('accepts video content when uploaded as file type', async () => {
    await expect(
        assertUploadedFileAllowed(
            {
              originalname: 'demo.mp4',
              mimetype: 'video/mp4',
              buffer: Buffer.from(
                  '00000018667479706d703432000000006d70343269736f6d',
                  'hex',
              ),
            } as Express.Multer.File,
            'file',
        ),
    ).resolves.toBeUndefined();
  });
});
