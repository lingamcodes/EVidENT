import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from './supabase';

type Options = {
  bucket: 'avatars' | 'event-covers';
  /** Path inside the bucket; must start with the user's id (storage policy). */
  path: string;
  /** Required shape [width, height], e.g. [3, 2] for covers, [1, 1] for avatars. */
  aspect: [number, number];
  /** Max output width in px. */
  width: number;
  /** JPEG quality 0–1. */
  quality: number;
};

/**
 * Lets the user pick a photo, crops it to exactly `aspect`, shrinks it to `width` px
 * JPEG, uploads it and returns its public URL. Returns null if the user cancels.
 *
 * Android's picker crops to any ratio, so the user frames it. iOS's built-in
 * cropper is square-only, so for non-square shapes iOS skips it and the centre
 * of the photo is cropped automatically. Either way the result is exactly `aspect`.
 */
export async function pickAndUploadImage({ bucket, path, aspect, width, quality }: Options): Promise<string | null> {
  const square = aspect[0] === aspect[1];
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: Platform.OS === 'android' || square,
    aspect,
    quality: 1,
  });
  if (picked.canceled) return null;

  const asset = picked.assets[0];
  const crop = centreCrop(asset.width, asset.height, aspect[0] / aspect[1]);
  const outWidth = Math.min(width, crop.width);
  const rendered = await ImageManipulator.manipulate(asset.uri)
    .crop(crop)
    .resize({ width: outWidth, height: Math.round(outWidth / (aspect[0] / aspect[1])) })
    .renderAsync();
  const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });

  const body = await fetch(image.uri).then((res) => res.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  // Paths can be reused (avatars), so add a version to bust image caches.
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/** Largest centred rectangle of the given ratio (width ÷ height) inside a w × h image. */
function centreCrop(w: number, h: number, ratio: number) {
  if (w / h > ratio) {
    const cropW = Math.round(h * ratio);
    return { originX: Math.round((w - cropW) / 2), originY: 0, width: cropW, height: h };
  }
  const cropH = Math.round(w / ratio);
  return { originX: 0, originY: Math.round((h - cropH) / 2), width: w, height: cropH };
}
