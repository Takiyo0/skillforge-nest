export const IMAGE_MAX = 5 * 1024 * 1024; // 5 MB
export const VIDEO_MAX = 50 * 1024 * 1024; // 50 MB
export const DEFAULT_MAX = 50 * 1024 * 1024; // default for other files

export function imageFileFilter(req: any, file: Express.Multer.File, cb: (err: any, acceptFile?: boolean) => void) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid image file type. Allowed: jpeg, png, gif, webp'), false);
}

export function videoFileFilter(req: any, file: Express.Multer.File, cb: (err: any, acceptFile?: boolean) => void) {
  const allowed = ['video/mp4', 'video/webm', 'video/ogg'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid video file type. Allowed: mp4, webm, ogg'), false);
}

export function multerOptions(type: 'image' | 'video' | 'file' = 'file') {
  const fileSize = type === 'image' ? IMAGE_MAX : type === 'video' ? VIDEO_MAX : DEFAULT_MAX;
  const options: any = { limits: { fileSize } };
  if (type === 'image') options.fileFilter = imageFileFilter;
  if (type === 'video') options.fileFilter = videoFileFilter;
  return options;
}
