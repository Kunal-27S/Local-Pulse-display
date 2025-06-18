import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload an image to Firebase Storage
 * @param {File} file - The image file to upload
 * @param {string} path - The storage path (e.g., 'posts', 'profiles', 'chats')
 * @param {string} userId - The user's ID
 * @returns {Promise<string>} The download URL of the uploaded image
 */
export const uploadImage = async (file, path, userId) => {
  try {
    // Create a unique filename using timestamp and original filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const storagePath = `${path}/${userId}/${filename}`;
    
    // Create a reference to the file location
    const storageRef = ref(storage, storagePath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Delete an image from Firebase Storage
 * @param {string} url - The download URL of the image to delete
 * @returns {Promise<void>}
 */
export const deleteImage = async (url) => {
  try {
    // Extract the path from the URL
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Get a resized image URL
 * @param {string} url - The original image URL
 * @param {number} width - Desired width
 * @param {number} height - Desired height
 * @returns {string} The resized image URL
 */
export const getResizedImageUrl = (url, width = 800, height = 600) => {
  if (!url) return url;
  
  // Add resize parameters to the URL
  const resizeParams = `_${width}x${height}`;
  return url.replace(/\.[^/.]+$/, `${resizeParams}$&`);
}; 