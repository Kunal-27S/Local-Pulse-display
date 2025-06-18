import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  AppBar,
  Toolbar,
  Slider,
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PhotoCamera,
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import { db } from '../firebaseConfig'; // Import Firestore db instance
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { collection, addDoc, Timestamp, GeoPoint, doc, getDoc } from 'firebase/firestore';
import { uploadImage } from '../utils/storage';

const StyledPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(3),
  overflow: 'hidden',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.divider}`,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  '& .MuiTypography-root': {
    color: theme.palette.text.primary,
  },
  '& .MuiTextField-root': {
    '& .MuiOutlinedInput-root': {
      color: theme.palette.text.primary,
      '& fieldset': {
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
      },
      '&:hover fieldset': {
        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
      },
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.text.secondary,
    },
    '& .MuiInputBase-input': {
      color: theme.palette.text.primary,
    },
  },
  '& .MuiChip-root': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    color: theme.palette.text.primary,
    '& .MuiChip-deleteIcon': {
      color: theme.palette.text.secondary,
      '&:hover': {
        color: theme.palette.error.main,
      },
    },
  },
  '& .MuiSlider-root': {
    color: theme.palette.primary.main,
    '& .MuiSlider-thumb': {
      '&:hover, &.Mui-focusVisible': {
        boxShadow: theme.palette.mode === 'dark' ? '0px 0px 0px 8px rgba(102, 126, 234, 0.16)' : '0px 0px 0px 8px rgba(102, 126, 234, 0.16)',
      },
    },
  },
  '& .MuiSwitch-root': {
    '& .MuiSwitch-switchBase': {
      '&.Mui-checked': {
        color: theme.palette.primary.main,
        '& + .MuiSwitch-track': {
          backgroundColor: theme.palette.primary.main,
        },
      },
    },
  },
}));

const ImagePreview = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '200px',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  border: `1px dashed ${theme.palette.divider}`,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  '& .MuiIconButton-root': {
    color: theme.palette.primary.main,
  },
}));

const CreatePost = () => {
  const theme = useTheme();
  const { currentUser } = useAuth(); // Get the current user
  const navigate = useNavigate(); // Initialize useNavigate
  const [formData, setFormData] = useState({
    title: '',
    caption: '',
    tags: [],
    duration: 12,
    isAnonymous: false,
  });
  const [imageFile, setImageFile] = useState(null); // Store image file
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null); // Store image preview URL
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false); // Loading state for submission
  const [error, setError] = useState(null); // Error state
  const [location, setLocation] = useState(null); // Store user's location
  const [locationLoading, setLocationLoading] = useState(true); // Loading state for location
  const [locationError, setLocationError] = useState(null); // Error state for location
  // ADD THIS: Missing snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoading(false);
        },
        (err) => {
          console.error('Geolocation error:', err.message);
          setLocationError('Unable to retrieve your location.');
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'isAnonymous' ? checked : value,
    }));
  };

  const handleDurationChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      duration: newValue,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const handleAddTag = () => {
    if (tagInput && formData.tags.length < 3 && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToDelete),
    }));
  };

  // ADD THIS: Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile || !formData.title || !currentUser || !formData.caption) {
      setError('Please fill in all required fields and ensure you are logged in.');
      return;
    }
    if (!location) {
      setError('Unable to retrieve your location. Please ensure location services are enabled.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user's profile data from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : null;

      // Use display name in order of preference: Firestore displayName -> Auth displayName -> email
      const displayName = userData?.displayName || currentUser.displayName || currentUser.email;
      
      // 1. Upload image to Firebase Storage
      const imageUrl = await uploadImage(imageFile, 'posts', currentUser.uid);

      // Calculate expiration timestamp
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + formData.duration * 60 * 60 * 1000);

      // 2. Create post in Firebase with pending status
      const newPost = {
        title: formData.title,
        description: formData.caption,
        tags: formData.tags,
        duration: formData.duration,
        isAnonymous: formData.isAnonymous,
        imageUrl: imageUrl,
        creatorId: currentUser.uid,
        username: formData.isAnonymous ? null : displayName,
        userAvatar: formData.isAnonymous ? null : (userData?.photoURL || currentUser.photoURL || ''),
        createdAt: Timestamp.fromDate(createdAt),
        expiresAt: Timestamp.fromDate(expiresAt),
        location: new GeoPoint(location.lat, location.lng),
        likes: 0,
        likedBy: [],
        eyewitnesses: 0,
        eyewitnessedBy: [],
        commentCount: 0,
        caption: formData.caption,
        verification_status: 'None',
        text_safe: 'not_processed',
        image_safe: 'not_processed',
        image_ai: 'not_processed',
        is_visible: false,
        retry_count: 0,
        requires_24hr_cooldown: false
      };

      // Save post to Firebase
      const postRef = await addDoc(collection(db, 'posts'), newPost);
      console.log('Post created successfully with ID:', postRef.id);

      // Create notification for pending verification
      const notificationData = {
        type: 'post_pending',
        postId: postRef.id,
        message: 'New post created. awaiting verification.',
        timestamp: Timestamp.now(),
        read: false
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'notifications'), notificationData);

      // 3. Trigger content verification after post is saved
      const contentFormData = new FormData();
      contentFormData.append('image', imageFile);
      contentFormData.append('title', formData.title);
      contentFormData.append('caption', formData.caption);

      try {
        await fetch('https://content-verification-g2plvgg63a-el.a.run.app', {
          method: 'POST',
          body: contentFormData
        });
      } catch (err) {
        console.error('Error triggering content verification:', err);
        // Don't block the post creation if verification fails
        // The background process will handle it
      }

      setLoading(false);
      setSnackbar({
        open: true,
        message: "Your post has been created and is pending verification. You'll be notified once it's approved.",
        severity: 'success'
      });
      navigate('/home');

    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* The AppBar is now in AppLayout */}
      <StyledPaper elevation={0}> {/* Adjust elevation */}
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>Create New Post</Typography> {/* Adjusted typography */}
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Upload Media</Typography>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="image-upload"
            type="file"
            onChange={handleImageChange}
            disabled={loading}
          />
          <label htmlFor="image-upload">
            <ImagePreview>
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Preview" />
              ) : locationLoading ? (
                 <CircularProgress />
              ) : locationError ? (
                 <Typography color="error" variant="body2">{locationError}</Typography>
              ) : (
                <IconButton component="span" color="primary" disabled={loading}>
                  <PhotoCamera fontSize="large" /> {/* Increased icon size */}
                </IconButton>
              )}
            </ImagePreview>
          </label>

          {imagePreviewUrl && (
            <Button onClick={() => handleImageChange({ target: { files: [] } })} startIcon={<DeleteIcon />} color="error" size="small" sx={{ mb: 2 }} disabled={loading}>
              Remove Media
            </Button>
          )}

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Add Details</Typography>
          <TextField
            fullWidth
            label="Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            margin="normal"
            required
            size="small"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Caption"
            name="caption"
            value={formData.caption}
            onChange={handleChange}
            margin="normal"
            required
            multiline
            rows={4}
            size="small"
            disabled={loading}
          />

          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Tags (max 3)</Typography>
            <TextField
              fullWidth
              label="Add Tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              margin="normal"
              disabled={formData.tags.length >= 3 || loading}
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleAddTag} disabled={!tagInput || formData.tags.length >= 3 || loading}>
                      <AddIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ mt: 1 }}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  sx={{ mr: 1, mb: 1 }}
                  disabled={loading}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Duration ({formData.duration} hours)</Typography>
            <Slider
              value={formData.duration}
              onChange={handleDurationChange}
              min={1}
              max={24}
              step={1}
              valueLabelDisplay="auto"
              sx={{ maxWidth: 300 }}
              disabled={loading}
            />
          </Box>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Location</Typography>
          <TextField
            fullWidth
            label="Auto-detected Location"
            value={location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : locationLoading ? 'Fetching...' : locationError || 'Location not available'}
            disabled
            margin="normal"
            size="small"
            InputProps={{
              startAdornment: locationLoading ? <InputAdornment position="start"><CircularProgress size={20} /></InputAdornment> : null,
            }}
          />

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Anonymity</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isAnonymous}
                onChange={handleChange}
                name="isAnonymous"
                disabled={loading}
              />
            }
            label="Post Anonymously"
          />

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 4 }}
            disabled={!imageFile || !formData.title || loading || !location || !formData.caption}
          >
            {loading ? 'Creating Post...' : 'Create Post'}
          </Button>
        </Box>
      </StyledPaper>
      
      {/* Location Error Snackbar */}
      <Snackbar
        open={!!locationError}
        autoHideDuration={6000}
        onClose={() => setLocationError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setLocationError(null)} severity="error" sx={{ width: '100%' }}>
          {locationError}
        </Alert>
      </Snackbar>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreatePost;
