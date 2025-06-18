import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Slider,
  Chip,
  CircularProgress,
  Container,
} from '@mui/material';
import { GoogleMap, useLoadScript, Marker, InfoWindow, OverlayView } from '@react-google-maps/api';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import placeholderImage from '../assets/placeholder.jpg';

// Helper function to normalize tag (handle singular/plural and case)
const normalizeTag = (tag) => {
  const lowercaseTag = tag.toLowerCase();
  // Remove 's' at the end if it exists, but only if the word is longer than 3 characters
  // This prevents words like 'news' from becoming 'new'
  if (lowercaseTag.length > 3 && lowercaseTag.endsWith('s')) {
    return lowercaseTag.slice(0, -1);
  }
  return lowercaseTag;
};

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 280px)',
  borderRadius: '4px',
};

// Custom CSS for the radiating blue dot
const radiatingDotStyles = `
  .live-location-marker {
    position: relative;
    width: 20px;
    height: 20px;
  }
  
  .live-location-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 12px;
    height: 12px;
    background-color: #2196F3;
    border: 2px solid white;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  
  .live-location-pulse {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    background-color: rgba(33, 150, 243, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: pulse 2s infinite;
  }
  
  .live-location-pulse:nth-child(2) {
    animation-delay: 0.5s;
  }
  
  .live-location-pulse:nth-child(3) {
    animation-delay: 1s;
  }
  
  @keyframes pulse {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.7;
    }
    70% {
      transform: translate(-50%, -50%) scale(3);
      opacity: 0;
    }
    100% {
      transform: translate(-50%, -50%) scale(3);
      opacity: 0;
    }
  }
`;

const libraries = ['places'];

const MapView = () => {
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const navigate = useNavigate();
  const watchIdRef = useRef(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Inject CSS styles
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = radiatingDotStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // Log any loading errors
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps loading error:', loadError);
    }
  }, [loadError]);

  // Add error handler for map
  const onMapError = (error) => {
    console.error('Map error:', error);
  };

  // Custom component for the live location marker
  const LiveLocationMarker = ({ position, accuracy }) => (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div className="live-location-marker">
        <div className="live-location-pulse"></div>
        <div className="live-location-pulse"></div>
        <div className="live-location-pulse"></div>
        <div className="live-location-dot"></div>
      </div>
    </OverlayView>
  );

  useEffect(() => {
    // Start watching user's location for live updates
    if (navigator.geolocation) {
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 30000 // Cache position for 30 seconds
      };

      const successCallback = (pos) => {
        const newPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        console.log('User position updated:', newPosition);
        setUserPosition(newPosition);
        setLocationAccuracy(pos.coords.accuracy);
        setLoading(false);
      };

      const errorCallback = (err) => {
        console.error('Geolocation error:', err.message);
        setError(`Location error: ${err.message}`);
        setLoading(false);
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        geoOptions
      );

      // Start watching position for live updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        successCallback,
        (err) => {
          console.warn('Watch position error:', err.message);
          // Don't set error for watch position failures, just log them
        },
        {
          ...geoOptions,
          maximumAge: 5000 // Update every 5 seconds
        }
      );

    } else {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
    }

    // Fetch posts from Firestore
    const fetchPosts = async () => {
      try {
        const postsCollection = collection(db, 'posts');
        const postsSnapshot = await getDocs(postsCollection);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(postsData);
      } catch (err) {
        console.error('Error fetching posts:', err);
      }
    };

    fetchPosts();

    // Cleanup function to stop watching position
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleRadiusChange = (event, newValue) => {
    setRadius(newValue);
  };

  const handleTagClick = (tag) => {
    setSelectedTags((prevSelectedTags) =>
      prevSelectedTags.includes(tag)
        ? prevSelectedTags.filter((t) => t !== tag)
        : [...prevSelectedTags, tag]
    );
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  const filteredPosts = posts.filter(post => {
    // Check if post is expired
    const isExpired = post.expiresAt && post.expiresAt.toDate() < new Date();
    if (isExpired) return false;

    // Filter by tags - now using normalized tags
    const hasSelectedTag = selectedTags.length === 0 || 
      (post.tags && post.tags.some(tag => {
        const normalizedPostTag = normalizeTag(tag);
        return selectedTags.some(selectedTag => 
          normalizedPostTag === normalizeTag(selectedTag) ||
          normalizedPostTag.includes(normalizeTag(selectedTag)) ||
          normalizeTag(selectedTag).includes(normalizedPostTag)
        );
      }));

    // Filter by radius if user location is available and post has location data
    let isInRadius = true;
    if (userPosition && post.location?.latitude && post.location?.longitude) {
      const postLat = post.location.latitude;
      const postLon = post.location.longitude;
      const userLat = userPosition.lat;
      const userLon = userPosition.lng;

      const distance = calculateDistance(userLat, userLon, postLat, postLon);
      isInRadius = distance <= radius;
    } else if (userPosition && (!post.location?.latitude || !post.location?.longitude)) {
      isInRadius = false;
    }

    return hasSelectedTag && isInRadius;
  });

  if (loading || !isLoaded) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || loadError) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <Typography color="error">Error: {error || loadError?.message}</Typography>
        </Box>
      </Container>
    );
  }

  const mapCenter = userPosition || (posts.length > 0 && posts[0].location ? 
    { lat: posts[0].location.latitude, lng: posts[0].location.longitude } : 
    { lat: 0, lng: 0 }
  );

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {/* Filter Panel */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>Filter by Tags:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {['Traffic', 'Events', 'Food', 'Safety'].map(tag => (
            <Chip
              key={tag}
              label={tag}
              clickable
              color={selectedTags.includes(tag) ? 'primary' : 'default'}
              onClick={() => handleTagClick(tag)}
            />
          ))}
        </Box>
        <Typography variant="subtitle2" gutterBottom>Radius: {radius} km</Typography>
        <Slider
          value={radius}
          onChange={handleRadiusChange}
          min={1}
          max={50}
          step={1}
          valueLabelDisplay="auto"
          sx={{ maxWidth: 200 }}
        />
        {locationAccuracy && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Location accuracy: ±{Math.round(locationAccuracy)}m
          </Typography>
        )}
      </Paper>

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={userPosition || mapCenter}
        zoom={userPosition ? 15 : 2}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
        onError={onMapError}
      >
        {/* Live user location with radiating blue dot */}
        {userPosition && (
          <LiveLocationMarker 
            position={userPosition} 
            accuracy={locationAccuracy}
          />
        )}

        {/* Posts markers */}
        {filteredPosts.map((post) => (
          post.location?.latitude && post.location?.longitude && (
            <Marker
              key={post.id}
              position={{ lat: post.location.latitude, lng: post.location.longitude }}
              onClick={() => setSelectedPost(post)}
              zIndex={1}
            />
          )
        ))}

        {/* Info Window for selected post */}
        {selectedPost && (
          <InfoWindow
            position={{ 
              lat: selectedPost.location.latitude, 
              lng: selectedPost.location.longitude 
            }}
            onCloseClick={() => setSelectedPost(null)}
          >
            <Box sx={{ width: 200 }}>
              <img 
                src={selectedPost.imageUrl || placeholderImage}
                alt="Post image" 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  borderRadius: 4, 
                  marginBottom: 4 
                }} 
              />
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                {selectedPost.title}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedPost.tags?.map(tag => (
                  <Chip 
                    key={tag} 
                    label={tag} 
                    size="small" 
                    sx={{ height: 20 }}
                  />
                ))}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Posted: {selectedPost.createdAt?.toDate().toLocaleString()}
              </Typography>
              {selectedPost.expiresAt && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Expires: {selectedPost.expiresAt.toDate().toLocaleString()}
                </Typography>
              )}
              <Box sx={{ mt: 1 }}>
                <button
                  onClick={() => navigate(`/posts/${selectedPost.id}`)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  View Details
                </button>
              </Box>
            </Box>
          </InfoWindow>
        )}
      </GoogleMap>
    </Container>
  );
};

export default MapView;