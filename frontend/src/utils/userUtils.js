import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Gets a user's display name from Firestore
 * @param {string} userId - The user's ID
 * @returns {Promise<string>} The user's display name or 'Anonymous User' if not found
 */
export const getUserDisplayName = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.displayName || 'Anonymous User';
    }
    return 'Anonymous User';
  } catch (error) {
    console.error('Error fetching user display name:', error);
    return 'Anonymous User';
  }
};

/**
 * Gets a user's profile data from Firestore
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} The user's profile data
 */
export const getUserProfile = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return {
      displayName: 'Anonymous User',
      photoURL: '',
      nickname: '',
      bio: ''
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      displayName: 'Anonymous User',
      photoURL: '',
      nickname: '',
      bio: ''
    };
  }
}; 