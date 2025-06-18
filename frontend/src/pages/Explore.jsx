import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Paper,
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
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.spacing(1),
  boxShadow: theme.shadows[1],
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    transition: 'transform 0.2s ease-in-out'
  }
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[1],
}));

const Explore = () => {
  const [tabValue, setTabValue] = useState(0);
  const [popularPosts, setPopularPosts] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingTags, setLoadingTags] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopularPosts = async () => {
      try {
        setLoadingPosts(true);
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('likes', 'desc'));
        const querySnapshot = await getDocs(q);
        
        let postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate the number of posts to show (20% of total)
        const numPostsToShow = Math.ceil(postsData.length * 0.2);
        
        // Get the top posts
        postsData = postsData.slice(0, numPostsToShow);

        setPopularPosts(postsData);
        setLoadingPosts(false);
      } catch (err) {
        console.error('Error fetching popular posts:', err);
        setError('Failed to fetch popular posts.');
        setLoadingPosts(false);
      }
    };

    const fetchPopularTags = async () => {
      try {
        setLoadingTags(true);
        const postsRef = collection(db, 'posts');
        const querySnapshot = await getDocs(postsRef);
        
        const tagCounts = {};
        querySnapshot.docs.forEach(doc => {
          const post = doc.data();
          post.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        });

        const sortedTags = Object.entries(tagCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setPopularTags(sortedTags);
        setLoadingTags(false);
      } catch (err) {
        console.error('Error fetching popular tags:', err);
        setLoadingTags(false);
      }
    };

    fetchPopularPosts();
    fetchPopularTags();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCardClick = (postId) => {
    navigate(`/posts/${postId}`);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>Explore</Typography>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        centered
      >
        <Tab label="Popular" />
        <Tab label="Tags" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>Most Popular Posts</Typography>
          {loadingPosts ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" textAlign="center" sx={{ mt: 4 }}>{error}</Typography>
          ) : popularPosts.length === 0 ? (
            <Typography textAlign="center" sx={{ mt: 4 }}>No popular posts found.</Typography>
          ) : (
            <Grid container spacing={3}>
              {popularPosts.map((post) => (
                <Grid item xs={12} key={post.id}>
                  <StyledCard elevation={0} onClick={() => handleCardClick(post.id)}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={post.imageUrl || placeholderImage}
                      alt={post.title}
                      sx={{ objectFit: 'cover' }}
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
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Favorite fontSize="small" color="error" />
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
                    </CardContent>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <StyledPaper elevation={0}>
            <Typography variant="h6" gutterBottom>Popular Tags</Typography>
            {loadingTags ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : popularTags.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No popular tags found.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {popularTags.map((tag) => (
                  <Chip
                    key={tag.name}
                    label={`${tag.name} (${tag.count})`}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </StyledPaper>
        </Box>
      )}
    </Container>
  );
};

export default Explore; 