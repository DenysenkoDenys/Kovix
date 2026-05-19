export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif'
]);

export const IMAGE_TOO_LARGE_MESSAGE = 'Фото занадто велике. Максимальний розмір — 2 MB.';
export const IMAGE_TYPE_MESSAGE = 'Будь ласка, виберіть зображення.';

export function validateImageFile(file) {
  if (!file) return 'Файл не вибрано.';
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return IMAGE_TOO_LARGE_MESSAGE;
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) return IMAGE_TYPE_MESSAGE;
  return null;
}

export function getUploadErrorMessage(error, fallbackMessage = 'Не вдалося завантажити зображення') {
  const serverMessage = error?.response?.data?.message || error?.response?.data || error?.message;

  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage;
  }

  return fallbackMessage;
}