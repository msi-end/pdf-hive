import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { addFile } from './files';

const IMAGE_DIR = `${FileSystem.documentDirectory}images/`;

/**
 * Ensure image directory exists
 */
const ensureImageDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
};

/**
 * Generate safe unique image filename
 */
const generateUniqueImageName = () => {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
};

/**
 * Request permissions
 */
const requestPermissions = async (fromCamera = false) => {
  const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!mediaPerm.granted) throw new Error('Media permission denied');

  if (fromCamera) {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) throw new Error('Camera permission denied');
  }
};

/**
 * Pick image
 */
const pickImage = async (fromCamera = false) => {
  await requestPermissions(fromCamera);

  const result = fromCamera
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

  if (result.canceled) return null;
  return result.assets[0];
};

/**
 * Import Image
 */
export const importImage = async ({ folderId, fromCamera = false }) => {
  if (!folderId) throw new Error('folderId is required');

  await ensureImageDir();

  const image = await pickImage(fromCamera);
  if (!image) return null;

  const fileName = generateUniqueImageName();
  const destinationPath = `${IMAGE_DIR}${fileName}`;

  await FileSystem.copyAsync({
    from: image.uri,
    to: destinationPath,
  });

  const fileId = await addFile({
    folderId,
    name: fileName,
    type: 'image',
    path: destinationPath,
    isFavorite: 0,
    isMarked: 0,
    lastOpenedPage: null,
  });

  return {
    id: fileId,
    name: fileName,
    path: destinationPath,
    type: 'image',
    folderId,
  };
};
