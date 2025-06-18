import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Avatar,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Favorite,
  Comment,
  Visibility,
  Settings as SettingsIcon,
  PhotoCamera,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import placeholderImage from '../assets/placeholder.jpg';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import axios from 'axios';
import { uploadImage, deleteImage } from '../utils/storage';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  boxShadow: theme.shadows[1],
}));

const Profile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [postFilter, setPostFilter] = useState(0); // 0 for Active, 1 for Expired
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState(null);
  const [userStats, setUserStats] = useState({ 
    posts: 0, 
    likes: 0, 
    eyewitnesses: 0,
    activePosts: 0,
    expiredPosts: 0 
  });
  const [userProfile, setUserProfile] = useState(null); // State for user profile data
  const [loadingProfile, setLoadingProfile] = useState(true); // Loading state for profile
  const [errorProfile, setErrorProfile] = useState(null); // Error state for profile
  
  // Edit Profile Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: '',
    bio: '',
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch user's profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) {
        setLoadingProfile(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserProfile(data);
          setEditForm({
            nickname: data.nickname || '',
            bio: data.bio || '',
          });
        } else {
          // Handle case where user document doesn't exist (e.g., old users)
          console.warn('User profile document not found for:', currentUser.uid);
          setUserProfile({ 
            displayName: currentUser.displayName || 'User', 
            nickname: 'N/A',
            bio: '',
            photoURL: currentUser.photoURL || ''
          });
        }
        setLoadingProfile(false);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setErrorProfile('Failed to fetch profile data.');
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [currentUser]); // Refetch profile if currentUser changes

  // Function to check if a post is expired and should be deleted
  const shouldDeletePost = (post) => {
    const now = Timestamp.now().toMillis();
    const expiresAt = post.expiresAt?.toMillis();
    const durationMillis = post.duration * 60 * 60 * 1000; // Convert duration hours to milliseconds
    const deleteTime = expiresAt + durationMillis; // Time when post should be deleted
    return now > deleteTime;
  };

  // Function to delete image from Firebase Storage
  const deleteImageFromStorage = async (imageUrl) => {
    try {
      await deleteImage(imageUrl);
      console.log('Successfully deleted image from Firebase Storage');
    } catch (error) {
      console.error('Error deleting image from Firebase Storage:', error);
    }
  };

  // Fetch user's posts and calculate stats
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!currentUser) {
        setLoadingPosts(false);
        return;
      }
      try {
        const postsCollectionRef = collection(db, 'posts');
        const userPostsQuery = query(
          postsCollectionRef,
          where('creatorId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(userPostsQuery);
        const postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Process posts and handle expired ones
        const now = Timestamp.now().toMillis();
        const processedPosts = [];
        const postsToDelete = [];

        for (const post of postsData) {
          if (shouldDeletePost(post)) {
            // Add to deletion queue
            postsToDelete.push(post);
          } else {
            processedPosts.push(post);
          }
        }

        // Delete expired posts and their images
        for (const post of postsToDelete) {
          try {
            // Delete the post document
            await deleteDoc(doc(db, 'posts', post.id));
            
            // Delete the image from Firebase Storage if it exists
            if (post.imageUrl) {
              await deleteImageFromStorage(post.imageUrl);
            }
          } catch (error) {
            console.error('Error deleting expired post:', error);
          }
        }

        setUserPosts(processedPosts);

        // Calculate stats
        const activePosts = processedPosts.filter(post => 
          post.expiresAt?.toMillis() > now
        ).length;
        const expiredPosts = processedPosts.length - activePosts;
        const totalLikes = processedPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
        const totalEyewitnesses = processedPosts.reduce((sum, post) => sum + (post.eyewitnesses || 0), 0);

        setUserStats({
          posts: processedPosts.length,
          likes: totalLikes,
          eyewitnesses: totalEyewitnesses,
          activePosts,
          expiredPosts
        });

        setLoadingPosts(false);
      } catch (err) {
        console.error('Error fetching user posts:', err);
        setErrorPosts('Failed to fetch your posts.');
        setLoadingPosts(false);
      }
    };

    fetchUserPosts();
  }, [currentUser]);

  const handlePostFilterChange = (event, newValue) => {
    setPostFilter(newValue);
  };

  const isPostActive = (post) => {
    const now = Timestamp.now().toMillis();
    const expirationTime = post.expiresAt?.toMillis();
    return expirationTime && expirationTime > now;
  };

  // Function to check if an expired post should still be displayed
  const shouldDisplayExpiredPost = (post) => {
    const now = Timestamp.now().toMillis();
    const createdAt = post.createdAt?.toMillis();
    const expiresAt = post.expiresAt?.toMillis();
    const durationMillis = post.duration * 60 * 60 * 1000; // Convert duration hours to milliseconds

    if (!createdAt || !expiresAt || !post.duration) return false; // Need all fields to calculate

    // Calculate the end time for displaying the expired post
    const expiredDisplayEndTime = expiresAt + durationMillis;

    // Post is expired if current time is past expiresAt
    const isExpired = now > expiresAt;

    // Display expired post if it's expired AND the current time is before the expired display end time
    return isExpired && now < expiredDisplayEndTime;
  };

  const filteredPosts = userPosts.filter(post =>
    postFilter === 0 ? isPostActive(post) : shouldDisplayExpiredPost(post)
  );

  const handleCardClick = (postId) => {
    navigate(`/posts/${postId}`);
  };

  const handleEditProfile = () => {
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedImage(null);
  };

  const handleImageSelect = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
    }
  };

  const handleEditSubmit = async () => {
    if (!currentUser) return;
    
    setUploading(true);
    try {
      let photoURL = userProfile.photoURL;

      // Upload new image to Firebase Storage if selected
      if (selectedImage) {
        // Get Firebase Storage instance
        const storage = getStorage();
        
        // Create a reference to the file location in Firebase Storage
        const fileExtension = selectedImage.name.split('.').pop();
        const fileName = `avatar.${fileExtension}`;
        const storageRef = ref(storage, `users/${currentUser.uid}/profile/${fileName}`);
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, selectedImage);
        
        // Get the download URL
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Update user profile in Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        nickname: editForm.nickname,
        bio: editForm.bio,
        photoURL: photoURL,
        updatedAt: Timestamp.now()
      });

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        nickname: editForm.nickname,
        bio: editForm.bio,
        photoURL: photoURL
      }));

      setEditDialogOpen(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorProfile('Failed to update profile.');
    } finally {
      setUploading(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="h6">Please sign in to view your profile.</Typography>
      </Container>
    );
  }

  if (loadingProfile || loadingPosts) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6">Loading profile...</Typography>
      </Container>
    );
  }

  if (errorProfile) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="error">{errorProfile}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <StyledPaper elevation={0}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              src={userProfile?.photoURL || currentUser.photoURL || placeholderImage}
              sx={{ width: 100, height: 100 }}
            />
          </Grid>
          <Grid item xs>
            <Typography variant="h4">{userProfile?.displayName || currentUser.displayName || 'User'}</Typography>
            {userProfile?.nickname && (
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                @{userProfile.nickname}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {currentUser.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userProfile?.bio || 'No bio yet'}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditProfile}
            >
              Edit Profile
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={4} textAlign="center">
              <Typography variant="h6">
                {userStats.posts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Posts
              </Typography>
            </Grid>
            <Grid item xs={4} textAlign="center">
              <Typography variant="h6">
                {userStats.likes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Likes
              </Typography>
            </Grid>
            <Grid item xs={4} textAlign="center">
              <Typography variant="h6">
                {userStats.eyewitnesses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Witnesses
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={6} textAlign="center">
              <Typography variant="h6">
                {userStats.activePosts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Posts
              </Typography>
            </Grid>
            <Grid item xs={6} textAlign="center">
              <Typography variant="h6">
                {userStats.expiredPosts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expired Posts
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </StyledPaper>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={selectedImage ? URL.createObjectURL(selectedImage) : userProfile?.photoURL}
                sx={{ width: 100, height: 100 }}
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCamera />}
              >
                Change Photo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </Button>
            </Box>
            <TextField
              label="Nickname"
              value={editForm.nickname}
              onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Bio"
              value={editForm.bio}
              onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
              multiline
              rows={4}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained"
            disabled={uploading}
          >
            {uploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Your Posts</Typography>

      <Tabs value={postFilter} onChange={handlePostFilterChange} centered sx={{ mb: 2 }}>
        <Tab label="Active Posts" />
        <Tab label="Expired Posts" />
      </Tabs>

      {loadingPosts ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : errorPosts ? (
        <Typography color="error" textAlign="center" sx={{ mt: 4 }}>{errorPosts}</Typography>
      ) : filteredPosts.length === 0 ? (
         <Typography textAlign="center" sx={{ mt: 4 }}>No posts found in this category.</Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredPosts.map((post) => (
            <Grid item xs={12} key={post.id}>
              <Card elevation={0} onClick={() => handleCardClick(post.id)} sx={{ cursor: 'pointer' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={post.imageUrl || placeholderImage}
                  alt={post.title}
                />
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {post.title}
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    {post.tags?.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ mr: 0.5 }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Favorite fontSize="small" />
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        {post.likes || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Comment fontSize="small" />
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        {post.commentCount || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Visibility fontSize="small" />
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        {post.eyewitnesses || 0}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {isPostActive(post) ? 'Active' : 'Expired'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Profile; 