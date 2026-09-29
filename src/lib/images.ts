import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

type Options = {
  bucket: 'avatars' | 'event-covers';
  /** Path inside the bucket; must start with the user's id (storage policy). */
  path: string;
  /** Crop ratio offered in the picker. */
  aspect: [number, number];
  /** Output width in px; height follows the crop ratio. */
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

  const rendered = await ImageManipulator.manipulate(picked.assets[0].uri)
    .resize({ width, height: Math.round((width * aspect[1]) / aspect[0]) })
    .renderAsync();
  const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });

  const body = await fetch(image.uri).then((res) => res.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  // Paths can be reused (avatars), so add a version to bust image caches.
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
