import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  FormControl,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Avatar,
  Tabs,
  Tab,
  InputLabel,
  Button,
} from '@mui/material';
import {
  Favorite,
  Comment,
  Visibility,
  Search as SearchIcon,
  FavoriteBorderOutlined,
  VisibilityOutlined,
  ChatBubbleOutline,
  FilterList as FilterListIcon,
  LocationOn as LocationOnIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import placeholderImage from '../assets/placeholder.jpg';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import OnboardingStepper from '../components/OnboardingStepper';

// Helper function to format time remaining
const formatTimeRemaining = (expiresAt) => {
  const now = new Date();
  const expirationDate = expiresAt?.toDate();
  if (!expirationDate || expirationDate < now) {
    return 'Expired';
  }

  const diffInMilliseconds = expirationDate.getTime() - now.getTime();
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  const days = Math.floor(diffInSeconds / (60 * 60 * 24));
  const hours = Math.floor((diffInSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((diffInSeconds % (60 * 60)) / 60);
  const seconds = diffInSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s remaining`;
  } else {
    return `${seconds}s remaining`;
  }
};

// Helper function to normalize tag (handle singular/plural)
const normalizeTag = (tag) => {
  const lowercaseTag = tag.toLowerCase();
  // Remove 's' at the end if it exists, but only if the word is longer than 3 characters
  // This prevents words like 'news' from becoming 'new'
  if (lowercaseTag.length > 3 && lowercaseTag.endsWith('s')) {
    return lowercaseTag.slice(0, -1);
  }
  return lowercaseTag;
};

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  borderRadius: theme.spacing(1),
  boxShadow: theme.shadows[1],
  cursor: 'pointer',
  maxWidth: '100%',
}));

// Anonymous user placeholder image
const anonymousAvatar = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState('5'); // Default to 5km
  const [userPreferredRadius, setUserPreferredRadius] = useState('5'); // Store user's preferred radius from settings
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { currentUser } = useAuth();
  const [selectedTag, setSelectedTag] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Fetch user's preferred radius from settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!currentUser) return;
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.settings?.radius) {
            setUserPreferredRadius(userData.settings.radius);
            setRadius(userData.settings.radius); // Set initial radius to user's preference
          }
        }
      } catch (err) {
        console.error('Error fetching user settings:', err);
      }
    };

    fetchUserSettings();
  }, [currentUser]);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error('Geolocation error:', err.message);
        }
      );
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Query posts
      const postsQuery = query(
        collection(db, 'posts'),
        where('expiresAt', '>', Timestamp.now()),
        orderBy('expiresAt', 'desc')
      );

      const querySnapshot = await getDocs(postsQuery);
      const postsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPosts(postsData);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchUsers();
  }, [fetchPosts, fetchUsers]);

  // Effect to update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer); // Cleanup timer on unmount
  }, []);

  useEffect(() => {
    const checkFirstVisit = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && !userDoc.data().nickname) {
            setShowOnboarding(true);
          }
        } catch (error) {
          console.error('Error checking first visit:', error);
        }
      }
    };

    checkFirstVisit();
  }, [currentUser]);

  const handleRadiusChange = (event) => {
    setRadius(event.target.value);
  };

  const handleCardClick = (postId) => {
    navigate(`/posts/${postId}`);
  };

  const handleTagClick = (tag) => {
    setSelectedTag(tag === selectedTag ? null : tag);
    setSearchQuery('');
  };

  const handleSearch = () => {
    if (searchQuery.trim() === '') {
      setShowSearchResults(false);
      return;
    }
    setShowSearchResults(true);
  };

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const filteredPosts = posts.filter(post => {
  let verification_tag = false;
  let expired_tag = true;

  // ✅ Show only visible and Approved posts
  if (post.is_visible && post.verification_status === 'Approved') {
    verification_tag = true;
  }

  // ✅ Exclude expired posts
  const now = Timestamp.now().toMillis();
  const expirationTime = post.expiresAt?.toMillis();
  if (!expirationTime || expirationTime < now) {
    expired_tag = false;
  }

  // ✅ Match tags
  const matchesTags = post.tags?.some(tag => {
    const normalizedPostTag = normalizeTag(tag);
    const normalizedSearchQuery = normalizeTag(searchQuery);
    return normalizedPostTag.includes(normalizedSearchQuery) ||
           normalizedSearchQuery.includes(normalizedPostTag);
  });

  // ✅ Match username or anonymous
  const matchesUsername =
    post.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.isAnonymous && searchQuery.toLowerCase() === 'anonymous');

  // ✅ Match title/caption
  const matchesSearch =
    searchQuery.trim() === '' ||
    post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    matchesTags ||
    matchesUsername;

  // ✅ Match selected tag (from filter chips)
  const matchesTag = !selectedTag ||
    post.tags?.some(tag => {
      const normalizedPostTag = normalizeTag(tag);
      const normalizedSelectedTag = normalizeTag(selectedTag);
      return normalizedPostTag.includes(normalizedSelectedTag) ||
             normalizedSelectedTag.includes(normalizedPostTag);
    });

  // ✅ Match radius
  const matchesRadius =
    !userLocation || !post.location || searchQuery.trim() !== '' || selectedTag
      ? true
      : calculateDistance(
          userLocation.lat,
          userLocation.lng,
          post.location.latitude,
          post.location.longitude
        ) <= parseInt(radius);

  return matchesSearch && matchesTag && matchesRadius && verification_tag && expired_tag;
});

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchTerm = searchQuery.toLowerCase().trim();
    const displayName = (user.displayName || '').toLowerCase();
    const nickname = (user.nickname || '').toLowerCase();
    return displayName.includes(searchTerm) || nickname.includes(searchTerm);
  });

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="h6">Loading posts...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <OnboardingStepper
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      <Box sx={{ mb: 3, position: 'relative' }}>
        <TextField
          fullWidth
          placeholder="Search posts, users, or tags..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch();
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Content Radius</InputLabel>
          <Select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            label="Content Radius"
          >
            <MenuItem value="1">1 km</MenuItem>
            <MenuItem value="3">3 km</MenuItem>
            <MenuItem value="5">5 km</MenuItem>
            <MenuItem value="10">10 km</MenuItem>
            <MenuItem value="20">20 km</MenuItem>
            <MenuItem value="50">50 km</MenuItem>
          </Select>
        </FormControl>
        {radius !== userPreferredRadius && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setRadius(userPreferredRadius)}
            sx={{ mb: 2 }}
          >
            Reset to Default ({userPreferredRadius} km)
          </Button>
        )}
        {!userLocation && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Location services are disabled. Enable location services to see posts within your selected radius.
          </Alert>
        )}

        {/* Search Results Dropdown */}
        {showSearchResults && searchQuery.trim() !== '' && (
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {/* User Results */}
            {filteredUsers.length > 0 && (
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                  Users
                </Typography>
                {filteredUsers.map(user => (
                  <Box
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Avatar
                      src={user.photoURL || anonymousAvatar}
                      alt={user.displayName}
                      sx={{ width: 32, height: 32, mr: 1 }}
                    />
                    <Box>
                      <Typography variant="body2">{user.displayName || 'Anonymous User'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.nickname ? `@${user.nickname}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Post Results */}
            {filteredPosts.length > 0 && (
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                  Posts
                </Typography>
                {filteredPosts.slice(0, 3).map(post => (
                  <Box
                    key={post.id}
                    onClick={() => {
                      handleCardClick(post.id);
                      setShowSearchResults(false);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        mr: 1,
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={post.imageUrl || placeholderImage}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2">{post.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {post.caption?.substring(0, 50)}...
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {filteredUsers.length === 0 && filteredPosts.length === 0 && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">No results found</Typography>
              </Box>
            )}
          </Paper>
        )}

        <Box sx={{ mb: 3 }}>
          {/* Filter bar (horizontally scrollable) */}
          <Box sx={{ 
            overflowX: 'auto', 
            whiteSpace: 'nowrap', 
            mb: 2, 
            '::-webkit-scrollbar': { display: 'none' }, 
            msOverflowStyle: 'none', 
            scrollbarWidth: 'none' 
          }}>
            {['Traffic', 'Events', 'Food', 'Safety', 'Community', 'Alerts', 'News'].map((tag) => (
              <Chip 
                key={tag} 
                label={tag} 
                sx={{ mr: 1 }} 
                clickable
                color={selectedTag === tag ? 'primary' : 'default'}
                onClick={() => handleTagClick(tag)}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: 2,
        width: '100%',
        justifyItems: 'center'
      }}>
        {filteredPosts.map(post => (
          <StyledCard 
            key={post.id} 
            onClick={() => handleCardClick(post.id)}
            sx={{ 
              width: '100%',
              maxWidth: 700,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* User Info Section */}
            <Box sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
              <Avatar 
                src={post.isAnonymous ? anonymousAvatar : (post.userAvatar || anonymousAvatar)} 
                alt={post.isAnonymous ? 'Anonymous' : (post.username || 'User')}
                sx={{ width: 24, height: 24 }}
              />
              <Typography variant="caption" sx={{ ml: 1, fontWeight: 500 }}>
                {post.isAnonymous ? 'Anonymous' : (post.username || 'Unknown User')}
              </Typography>
            </Box>

            {/* Image Section with Black Background */}
            <Box sx={{ 
              width: '100%',
              position: 'relative',
              backgroundColor: '#000',
              paddingTop: '60%', // This creates 5:3 aspect ratio (3/5 = 0.6 = 60%)
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              <CardMedia
                component="img"
                image={post.imageUrl || placeholderImage}
                alt={post.title}
                sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </Box>

            {/* Post Details Section */}
            <Box sx={{ p: 1, flex: 1 }}>
              {/* Title and Time */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
                  {post.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 12, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {formatTimeRemaining(post.expiresAt)}
                  </Typography>
                </Box>
              </Box>

              {/* Caption */}
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.7rem',
                  mb: 0.5
                }}
              >
                {post.caption}
              </Typography>

              {/* Tags */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                {post.tags?.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagClick(tag);
                    }}
                    sx={{ 
                      height: 16,
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontSize: '0.65rem',
                      },
                      bgcolor: selectedTag === tag ? 'primary.main' : 'action.selected',
                      color: selectedTag === tag ? 'primary.contrastText' : 'text.primary',
                      '&:hover': {
                        bgcolor: selectedTag === tag ? 'primary.dark' : 'action.selected',
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Interaction Section */}
            <CardActions sx={{ px: 1, py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    {post.likedBy?.includes(currentUser?.uid) ? (
                      <Favorite sx={{ fontSize: 16 }} color="error" />
                    ) : (
                      <FavoriteBorderOutlined sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                  <Typography variant="caption" sx={{ ml: 0.25, fontSize: '0.7rem' }}>
                    {post.likes || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    <ChatBubbleOutline sx={{ fontSize: 16 }} />
                  </IconButton>
                  <Typography variant="caption" sx={{ ml: 0.25, fontSize: '0.7rem' }}>
                    {post.commentCount || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton size="small" sx={{ p: 0.25 }}>
                    <VisibilityOutlined sx={{ fontSize: 16 }} />
                  </IconButton>
                  <Typography variant="caption" sx={{ ml: 0.25, fontSize: '0.7rem' }}>
                    {post.eyewitnesses || 0}
                  </Typography>
                </Box>
              </Box>
            </CardActions>
          </StyledCard>
        ))}
      </Box>
    </Container>
  );
};

export default Home;
 