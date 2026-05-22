import {BadRequestException} from '@nestjs/common';
import {MulterOptions} from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import {fromBuffer as fileTypeFromBuffer} from 'file-type';
import {basename, extname} from 'path';

export const IMAGE_MAX = 5 * 1024 * 1024; // 5 MB
export const VIDEO_MAX = 50 * 1024 * 1024; // 50 MB
export const DEFAULT_MAX = 25 * 1024 * 1024; // default for other files

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/avif',
];

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-m4v',
  'video/3gpp',
  'video/3gpp2',
];

const RESOURCE_BINARY_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
];

const RESOURCE_TEXT_MIME_TYPES = [
  'application/json',
  'application/x-ipynb+json',
  'application/xml',
  'text/xml',
  'application/yaml',
  'application/x-yaml',
  'text/yaml',
  'text/csv',
  'text/markdown',
  'text/x-markdown',
  'text/plain',
];

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
  '.avif',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.ogg',
  '.mov',
  '.m4v',
  '.3gp',
  '.3g2',
]);

const RESOURCE_EXTENSIONS = new Set([
  '.pdf',
  '.json',
  '.ipynb',
  '.zip',
  '.7z',
  '.rar',
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.cpp',
  '.cxx',
  '.cc',
  '.c',
  '.h',
  '.hpp',
  '.swift',
  '.kt',
  '.kts',
  '.scala',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.dockerfile',
  '.docx',
  '.pptx',
  '.xlsx',
  '.odt',
  '.odp',
  '.ods',
]);

const RESOURCE_TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.tsv',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.cpp',
  '.cxx',
  '.cc',
  '.c',
  '.h',
  '.hpp',
  '.swift',
  '.kt',
  '.kts',
  '.scala',
  '.sql',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.dockerfile',
  '.json',
  '.ipynb',
]);

const RESOURCE_SIGNATURE_MIME_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
]);

const IMAGE_FILE_TYPE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heic-sequence',
  'image/heif',
  'image/heif-sequence',
  'image/avif',
]);

const VIDEO_FILE_TYPE_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-m4v',
  'video/3gpp',
  'video/3gpp2',
]);

const GENERIC_TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/x-ipynb+json',
  'application/xml',
  'application/yaml',
  'application/x-yaml',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'text/xml',
  'text/yaml',
]);

const IMAGE_ERROR_MESSAGE =
    'Invalid image file type. Allowed: jpg, png, gif, webp, heic, heif, avif';
const VIDEO_ERROR_MESSAGE =
    'Invalid video file type. Allowed: mp4, webm, ogg, mov, m4v, 3gp';
const RESOURCE_ERROR_MESSAGE =
    'Invalid resource file type. Allowed: documents, slides, spreadsheets, notebooks, code files, text files, datasets, and archives';

function getFileExtension(
    file: Pick<Express.Multer.File, 'originalname'>,
): string {
  const originalName = (file.originalname || '').toLowerCase();
  if (basename(originalName) === 'dockerfile') {
    return '.dockerfile';
  }

  return extname(originalName);
}

function hasAllowedMimeOrExtension(
    file: Pick<Express.Multer.File, 'mimetype' | 'originalname'>,
    mimeTypes: readonly string[],
    extensions: ReadonlySet<string>,
): boolean {
  return (
      mimeTypes.includes(file.mimetype) || extensions.has(getFileExtension(file))
  );
}

export function imageFileFilter(
    req: any,
    file: Express.Multer.File,
    cb: (err: any, acceptFile: boolean) => void,
) {
  if (hasAllowedMimeOrExtension(file, IMAGE_MIME_TYPES, IMAGE_EXTENSIONS)) {
    cb(null, true);
    return;
  }

  cb(new BadRequestException(IMAGE_ERROR_MESSAGE), false);
}

export function videoFileFilter(
    req: any,
    file: Express.Multer.File,
    cb: (err: any, acceptFile: boolean) => void,
) {
  if (hasAllowedMimeOrExtension(file, VIDEO_MIME_TYPES, VIDEO_EXTENSIONS)) {
    cb(null, true);
    return;
  }

  cb(new BadRequestException(VIDEO_ERROR_MESSAGE), false);
}

export function resourceFileFilter(
    req: any,
    file: Express.Multer.File,
    cb: (err: any, acceptFile: boolean) => void,
) {
  const extension = getFileExtension(file);
  const hasAllowedExtension = RESOURCE_EXTENSIONS.has(extension);
  const hasAllowedBinaryMime = RESOURCE_BINARY_MIME_TYPES.includes(
      file.mimetype,
  );
  const hasAllowedTextMime =
      RESOURCE_TEXT_MIME_TYPES.includes(file.mimetype) && hasAllowedExtension;
  const hasAllowedVideo = hasAllowedMimeOrExtension(
      file,
      VIDEO_MIME_TYPES,
      VIDEO_EXTENSIONS,
  );
  const hasAllowedImage = hasAllowedMimeOrExtension(
      file,
      IMAGE_MIME_TYPES,
      IMAGE_EXTENSIONS,
  );

  if (
      hasAllowedExtension ||
      hasAllowedBinaryMime ||
      hasAllowedTextMime ||
      hasAllowedVideo ||
      hasAllowedImage
  ) {
    cb(null, true);
    return;
  }

  cb(new BadRequestException(RESOURCE_ERROR_MESSAGE), false);
}

export function multerOptions(type: 'image' | 'video' | 'file' = 'file') {
  const fileSize =
      type === 'image' ? IMAGE_MAX : type === 'video' ? VIDEO_MAX : DEFAULT_MAX;
  const options: MulterOptions = {limits: {fileSize}};
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

  if (type === 'file' && !(await hasValidFileSignature(file))) {
    throw new BadRequestException('Invalid resource file content');
  }
}

async function hasValidFileSignature(
    file: Express.Multer.File,
): Promise<boolean> {
  if (await hasValidImageSignature(file)) {
    return true;
  }

  if (await hasValidVideoSignature(file)) {
    return true;
  }

  return hasValidResourceSignature(file);
}

async function hasValidImageSignature(
    file: Express.Multer.File,
): Promise<boolean> {
  const detected = await fileTypeFromBuffer(file.buffer);
  return Boolean(detected && IMAGE_FILE_TYPE_MIME_TYPES.has(detected.mime));
}

async function hasValidVideoSignature(
    file: Express.Multer.File,
): Promise<boolean> {
  const detected = await fileTypeFromBuffer(file.buffer);
  return Boolean(detected && VIDEO_FILE_TYPE_MIME_TYPES.has(detected.mime));
}

async function hasValidResourceSignature(
    file: Express.Multer.File,
): Promise<boolean> {
  const extension = getFileExtension(file);

  if (
      RESOURCE_TEXT_EXTENSIONS.has(extension) ||
      (GENERIC_TEXT_MIME_TYPES.has(file.mimetype) &&
          RESOURCE_EXTENSIONS.has(extension))
  ) {
    return true;
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected) return false;

  if (RESOURCE_SIGNATURE_MIME_TYPES.has(detected.mime)) {
    return true;
  }

  if (extension === '.pdf') {
    return detected.mime === 'application/pdf';
  }

  if (extension === '.zip') {
    return detected.mime === 'application/zip';
  }

  if (extension === '.7z') {
    return detected.mime === 'application/x-7z-compressed';
  }

  if (extension === '.rar') {
    return detected.mime === 'application/x-rar-compressed';
  }

  return RESOURCE_EXTENSIONS.has(extension);
}
