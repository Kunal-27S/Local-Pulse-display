import { db } from '../firebaseConfig';
import { collection, getDocs, writeBatch, query, doc, getDoc } from 'firebase/firestore';

export const migrateNotifications = async (currentUser) => {
  if (!currentUser) {
    console.log('No user logged in, skipping migration');
    return false;
  }

  try {
    console.log('Starting migration for user:', currentUser.uid);

    // Only migrate notifications for the current user
    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);

    if (notificationsSnapshot.empty) {
      console.log('No notifications found for user:', currentUser.uid);
      return true;
    }

    console.log(`Found ${notificationsSnapshot.docs.length} notifications to process`);

    // Use batched writes for better performance
    const batch = writeBatch(db);
    let batchCount = 0;
    let updatedCount = 0;

    for (const notificationDoc of notificationsSnapshot.docs) {
      const notificationData = notificationDoc.data();
      
      // Only update if seen field doesn't exist
      if (notificationData.seen === undefined) {
        try {
          batch.update(notificationDoc.ref, {
            seen: false // Set all existing notifications as unseen
          });
          batchCount++;
          updatedCount++;

          // Firestore batches are limited to 500 operations
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`Committed batch of ${batchCount} updates`);
            batchCount = 0;
          }
        } catch (error) {
          console.error('Error updating notification:', notificationDoc.id, error);
        }
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates`);
    }

    console.log(`Successfully migrated ${updatedCount} notifications for user:`, currentUser.uid);
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    return false;
  }
}; 