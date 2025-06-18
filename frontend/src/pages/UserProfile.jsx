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
  Divider,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Favorite,
  Comment,
  Visibility,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import placeholderImage from '../assets/placeholder.jpg';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  boxShadow: theme.shadows[1],
}));

const UserProfile = () => {
  const { userId } = useParams();
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
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState(null);

  // Fetch user's profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setLoadingProfile(false);
        return;
      }
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserProfile(data);
        } else {
          setErrorProfile('User not found');
        }
        setLoadingProfile(false);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setErrorProfile('Failed to fetch profile data.');
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  // Function to check if a post is expired and should be deleted
  const shouldDeletePost = (post) => {
    const now = Timestamp.now().toMillis();
    const expiresAt = post.expiresAt?.toMillis();
    const durationMillis = post.duration * 60 * 60 * 1000; // Convert duration hours to milliseconds
    const deleteTime = expiresAt + durationMillis; // Time when post should be deleted
    return now > deleteTime;
  };

  // Fetch user's posts and calculate stats
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!userId) {
        setLoadingPosts(false);
        return;
      }
      try {
        const postsCollectionRef = collection(db, 'posts');
        const userPostsQuery = query(
          postsCollectionRef,
          where('creatorId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(userPostsQuery);
        const postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Process posts
        const now = Timestamp.now().toMillis();
        const processedPosts = [];

        for (const post of postsData) {
          if (!shouldDeletePost(post)) {
            processedPosts.push(post);
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
        setErrorPosts('Failed to fetch posts.');
        setLoadingPosts(false);
      }
    };

    fetchUserPosts();
  }, [userId]);

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

    if (!createdAt || !expiresAt || !post.duration) return false;

    const expiredDisplayEndTime = expiresAt + durationMillis;
    const isExpired = now > expiresAt;

    return isExpired && now < expiredDisplayEndTime;
  };

  const filteredPosts = userPosts.filter(post =>
    postFilter === 0 ? isPostActive(post) : shouldDisplayExpiredPost(post)
  );

  const handleCardClick = (postId) => {
    navigate(`/posts/${postId}`);
  };

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
              src={userProfile?.photoURL || placeholderImage}
              sx={{ width: 100, height: 100 }}
            />
          </Grid>
          <Grid item xs>
            <Typography variant="h4">{userProfile?.displayName || 'User'}</Typography>
            {userProfile?.nickname && (
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                @{userProfile.nickname}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {userProfile?.bio || 'No bio yet'}
            </Typography>
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

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Posts</Typography>

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

export default UserProfile; 