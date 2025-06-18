import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import placeholderImage from '../assets/placeholder.jpg';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const Settings = ({ toggleTheme, darkMode }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    radius: '5',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Fetch user settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
           const userData = userDoc.data();
           console.log('Fetched user data:', userData);
           
           if(userData.settings) {
              console.log('Current settings:', userData.settings);
              setSettings(userData.settings);
              
              // Apply theme from Firebase settings
              if (userData.settings.theme) {
                const storedTheme = userData.settings.theme; // "dark" or "light"
                console.log('Stored theme:', storedTheme, 'Current darkMode:', darkMode);
                
                // Only toggle if the current theme doesn't match the stored theme
                if ((storedTheme === "dark" && !darkMode) || (storedTheme === "light" && darkMode)) {
                  console.log('Toggling theme to match stored preference');
                  toggleTheme();
                }
              }
           }
           // Set the current avatar URL from user data
           if (userData.photoURL) {
              setCurrentAvatarUrl(userData.photoURL);
           }
        }
        setLoading(false);
        setThemeLoaded(true);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings.');
        setLoading(false);
        setThemeLoaded(true);
      }
    };

    fetchSettings();
  }, [currentUser]);

  // Save settings to Firestore whenever settings state changes
  useEffect(() => {
     if (!currentUser || loading || uploadingAvatar || !themeLoaded) return;

     const saveSettings = async () => {
        setSaving(true);
        try {
           const userDocRef = doc(db, 'users', currentUser.uid);
           await setDoc(userDocRef, { settings: settings }, { merge: true });
           setSaving(false);
        } catch (err) {
           console.error('Error saving settings:', err);
           setSaving(false);
        }
     };

     saveSettings();
  }, [settings, currentUser, loading, uploadingAvatar, themeLoaded]);

  const handleSettingChange = (setting) => (event) => {
    if (setting === 'darkMode') {
      const newTheme = !darkMode;
      console.log('Theme toggle requested. New theme will be:', newTheme ? 'dark' : 'light');
      
      // Update theme in Firebase settings
      const updateTheme = async () => {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const newSettings = {
            ...settings,
            theme: newTheme ? "dark" : "light"
          };
          console.log('Updating settings in Firebase:', newSettings);
          
          await setDoc(userDocRef, { 
            settings: newSettings
          }, { merge: true });
          
          // Update local settings state
          setSettings(newSettings);
          
          // Only toggle theme after successful Firebase update
          console.log('Firebase update successful, toggling theme');
          toggleTheme();
        } catch (err) {
          console.error('Error updating theme:', err);
          toggleTheme();
        }
      };
      updateTheme();
    } else if (setting === 'radius'){
       setSettings((prev) => ({
         ...prev,
         [setting]: event.target.value,
       }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAvatarError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setAvatarError('Image size should be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !currentUser) return;

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      // Get Firebase Storage instance
      const storage = getStorage();
      
      // Create a reference to the file location in Firebase Storage
      // Using a more secure path structure
      const fileExtension = avatarFile.name.split('.').pop();
      const fileName = `avatar.${fileExtension}`;
      const storageRef = ref(storage, `users/${currentUser.uid}/profile/${fileName}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, avatarFile);
      
      // Get the download URL
      const avatarUrl = await getDownloadURL(snapshot.ref);

      // Update user document with the new photo URL
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { photoURL: avatarUrl }, { merge: true });

      setCurrentAvatarUrl(avatarUrl);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setUploadingAvatar(false);

      alert('Profile picture updated successfully!');

    } catch (err) {
      console.error('Error uploading avatar:', err);
      setAvatarError('Failed to upload avatar. Please try again.');
      setUploadingAvatar(false);
    }
  };

  const handleRadiusChange = (event) => {
    setSettings((prev) => ({
      ...prev,
      radius: event.target.value,
    }));
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    navigate('/');
  };

  if (!currentUser) {
     return (
       <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
         <Typography variant="h6">Please sign in to manage settings.</Typography>
       </Container>
     );
  }

  if (loading) {
     return (
       <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
         <CircularProgress />
         <Typography variant="h6">Loading settings...</Typography>
       </Container>
     );
  }

  if (error) {
     return (
       <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
         <Typography variant="h6" color="error">{error}</Typography>
       </Container>
     );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Typography>

      {/* Profile Picture Section */}
      <StyledPaper>
         <Typography variant="h6" gutterBottom>
            Profile Picture
         </Typography>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 2 }}>
            <Avatar
               src={avatarPreviewUrl || currentAvatarUrl || placeholderImage}
               sx={{ width: 80, height: 80 }}
            />
            <Box>
               <input
                 accept="image/*"
                 style={{ display: 'none' }}
                 id="avatar-upload"
                 type="file"
                 onChange={handleAvatarChange}
                 disabled={uploadingAvatar || saving}
               />
               <label htmlFor="avatar-upload">
                 <Button variant="outlined" component="span" disabled={uploadingAvatar || saving}>
                   Change Picture
                 </Button>
               </label>
               {avatarFile && (
                  <Button 
                     onClick={() => {
                       setAvatarFile(null);
                       setAvatarPreviewUrl(null);
                     }}
                     color="error" 
                     size="small" 
                     sx={{ ml: 1 }}
                     disabled={uploadingAvatar || saving}
                   >
                     Cancel
                   </Button>
               )}
               {avatarFile && (
                  <Button
                     variant="contained"
                     onClick={handleUploadAvatar}
                     size="small"
                     sx={{ ml: 1 }}
                     disabled={uploadingAvatar || saving}
                   >
                     {uploadingAvatar ? <CircularProgress size={20} /> : 'Upload'}
                   </Button>
               )}
            </Box>
         </Box>
         {avatarError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {avatarError}
            </Typography>
         )}
      </StyledPaper>

      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Dark Mode"
              secondary="Switch between light and dark theme"
            />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                checked={darkMode}
                onChange={handleSettingChange('darkMode')}
                disabled={saving}
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </StyledPaper>

      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Content Radius
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Visible Content Radius"
              secondary="Set the maximum distance (in kilometers) for posts in your feed and map view"
            />
            <FormControl sx={{ minWidth: 120 }}>
               <Select
                 value={settings.radius}
                 onChange={handleRadiusChange}
                 size="small"
                 disabled={saving}
               >
                 <MenuItem value="1">1 km</MenuItem>
                 <MenuItem value="3">3 km</MenuItem>
                 <MenuItem value="5">5 km</MenuItem>
                 <MenuItem value="10">10 km</MenuItem>
                 <MenuItem value="20">20 km</MenuItem>
                 <MenuItem value="50">50 km</MenuItem>
               </Select>
             </FormControl>
          </ListItem>
        </List>
      </StyledPaper>

      <StyledPaper>
        <Typography variant="h6" gutterBottom color="error">
          Danger Zone
        </Typography>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={saving}
        >
          Delete Account
        </Button>
      </StyledPaper>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This action cannot be
            undone. All your posts and data will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" disabled={saving}>
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;