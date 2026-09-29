import { pickAndUploadImage } from './images';

/** Square 512px JPEG at 70% (~50–100 KB), stored at avatars/<userId>/avatar.jpg. */
export function pickAndUploadAvatar(userId: string) {
  return pickAndUploadImage({
    bucket: 'avatars',
    path: `${userId}/avatar.jpg`,
    aspect: [1, 1],
    width: 512,
    quality: 0.7,
  });
}
