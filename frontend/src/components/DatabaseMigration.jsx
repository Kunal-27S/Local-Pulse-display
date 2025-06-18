import { useEffect, useState } from 'react';
import { migrateNotifications } from '../utils/migrationScript';
import { Alert, Snackbar } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const DatabaseMigration = () => {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const runMigration = async () => {
      if (!currentUser) {
        console.log('No user logged in, skipping migration');
        return;
      }

      // Check if migration notification has already been shown for this user
      const hasShownMigrationNotification = localStorage.getItem(`migration_notification_shown_${currentUser.uid}`);
      if (hasShownMigrationNotification) {
        console.log('Migration notification already shown for this user, skipping.');
        return;
      }

      try {
        console.log('Starting database migration for user:', currentUser.uid);
        const success = await migrateNotifications(currentUser);
        if (success) {
          console.log('Migration completed successfully');
          setMigrationStatus('success');
          // Mark that the migration notification has been shown for this user
          localStorage.setItem(`migration_notification_shown_${currentUser.uid}`, 'true');
        } else {
          console.log('Migration failed');
          setMigrationStatus('error');
        }
      } catch (error) {
        console.error('Migration failed:', error);
        setMigrationStatus('error');
      }
    };

    runMigration();
  }, [currentUser]);

  return (
    <Snackbar
      open={migrationStatus !== null}
      autoHideDuration={6000}
      onClose={() => setMigrationStatus(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => setMigrationStatus(null)}
        severity={migrationStatus === 'success' ? 'success' : 'error'}
        sx={{ width: '100%' }}
      >
        {migrationStatus === 'success'
          ? 'Notifications system updated successfully'
          : 'Failed to update notifications system'}
      </Alert>
    </Snackbar>
  );
};

export default DatabaseMigration; 