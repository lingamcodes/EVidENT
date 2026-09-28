import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.7;

/**
 * Lets the user pick a photo, crops it square, shrinks it to 512px JPEG (~50–100 KB),
 * uploads it to avatars/<userId>/avatar.jpg and returns its public URL.
 * Returns null if the user cancels.
 */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled) return null;

  const rendered = await ImageManipulator.manipulate(picked.assets[0].uri)
    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE })
    .renderAsync();
  const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: AVATAR_QUALITY });

  const body = await fetch(image.uri).then((res) => res.arrayBuffer());
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  // Same path on every upload, so add a version to bust image caches.
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
