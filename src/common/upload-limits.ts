import {BadRequestException} from '@nestjs/common';
import {fromBuffer as fileTypeFromBuffer} from 'file-type';

export const IMAGE_MAX = 5 * 1024 * 1024; // 5 MB
export const VIDEO_MAX = 50 * 1024 * 1024; // 50 MB
export const DEFAULT_MAX = 25 * 1024 * 1024; // default for other files

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
];

export function imageFileFilter(req: any, file: Express.Multer.File, cb: (err: any, acceptFile?: boolean) => void) {
  if (IMAGE_MIME_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid image file type. Allowed: jpeg, png, gif, webp'), false);
}

export function videoFileFilter(req: any, file: Express.Multer.File, cb: (err: any, acceptFile?: boolean) => void) {
  if (VIDEO_MIME_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid video file type. Allowed: mp4, webm, ogg'), false);
}

export function resourceFileFilter(req: any, file: Express.Multer.File, cb: (err: any, acceptFile?: boolean) => void) {
  if (RESOURCE_MIME_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid resource file type. Allowed: pdf, json, zip, txt, md'), false);
}

export function multerOptions(type: 'image' | 'video' | 'file' = 'file') {
  const fileSize = type === 'image' ? IMAGE_MAX : type === 'video' ? VIDEO_MAX : DEFAULT_MAX;
  const options: any = { limits: { fileSize } };
  if (type === 'image') options.fileFilter = imageFileFilter;
  if (type === 'video') options.fileFilter = videoFileFilter;
  if (type === 'file') options.fileFilter = resourceFileFilter;
  return options;
}

export async function assertUploadedFileAllowed(
    file: Express.Multer.File,
    type: 'image' | 'video' | 'file',
): Promise<void> {
  if (type === 'image' && !(await hasValidImageSignature(file))) {
    throw new BadRequestException('Invalid image file content');
  }

  if (type === 'video' && !(await hasValidVideoSignature(file))) {
    throw new BadRequestException('Invalid video file content');
  }

  if (type === 'file' && !(await hasValidResourceSignature(file))) {
    throw new BadRequestException('Invalid resource file content');
  }
}

async function hasValidImageSignature(file: Express.Multer.File): Promise<boolean> {
  const detected = await fileTypeFromBuffer(file.buffer);
  return Boolean(detected && IMAGE_MIME_TYPES.includes(detected.mime));
}

async function hasValidVideoSignature(file: Express.Multer.File): Promise<boolean> {
  const detected = await fileTypeFromBuffer(file.buffer);
  return Boolean(detected && VIDEO_MIME_TYPES.includes(detected.mime));
}

async function hasValidResourceSignature(file: Express.Multer.File): Promise<boolean> {
  // Text-like formats are intentionally not magic-byte validated to reduce false positives.
  if (file.mimetype === 'application/json' || file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
    return true;
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected) return false;

  if (file.mimetype === 'application/pdf') {
    return detected.mime === 'application/pdf';
  }

  if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
    return detected.mime === 'application/zip';
  }

  return true;
}
