import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

type Options = {
  bucket: 'avatars' | 'event-covers';
  /** Path inside the bucket; must start with the user's id (storage policy). */
  path: string;
  /**
   * Fixed crop ratio (Android only — iOS's crop is always square). Leave out to
   * keep whatever crop the user picks.
   */
  aspect?: [number, number];
  /** Max output width in px; height follows the photo's own shape (never stretched). */
  width: number;
  /** JPEG quality 0–1. */
  quality: number;
};

/**
 * Lets the user pick a photo, crops it, shrinks it to `width` px JPEG, uploads it
 * and returns its public URL. Returns null if the user cancels.
 */
export async function pickAndUploadImage({ bucket, path, aspect, width, quality }: Options): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect,
    quality: 1,
  });
  if (picked.canceled) return null;

  const asset = picked.assets[0];
  // Width only, so the crop's shape is kept; never enlarge small photos.
  const rendered = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: Math.min(width, asset.width || width) })
    .renderAsync();
  const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });

  const body = await fetch(image.uri).then((res) => res.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  // Paths can be reused (avatars), so add a version to bust image caches.
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
