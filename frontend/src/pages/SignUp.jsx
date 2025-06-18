import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
  IconButton,
  Alert,
  ThemeProvider,
  createTheme,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import placeholderImage from '../assets/signup1.jpeg';
import placeholderImage2 from '../assets/signup2.jpeg';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import OTPVerificationDialog from '../components/OTPVerificationDialog';
import { generateOTP, storeOTP, sendOTPEmail } from '../services/emailService';

const marqueeImages = [
  '/assets/marquee/image1.png',
  '/assets/marquee/image2.png',
  '/assets/marquee/image3.png',
  '/assets/marquee/image4.png',
  '/assets/marquee/image5.png',
  '/assets/marquee/image6.png',
];

// Create a fixed dark theme for auth pages
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const FullPage = styled('div')({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#121212',
});

const MarqueeContainer = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  zIndex: 0,
});

const MarqueeTrack = styled(Box)({
  display: 'flex',
  whiteSpace: 'nowrap',
  willChange: 'transform',
  animation: 'marquee 60s linear infinite',
  '@keyframes marquee': {
    '0%': { transform: 'translate(0%, 0%)' },
    '100%': { transform: 'translate(-100%, -100%)' },
  },
});

const MarqueeImage = styled('img')({
  height: '300px',
  marginRight: '20px',
});

const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: '400px',
  width: '100%',
  background: '#1e1e1e',
  color: '#fff',
}));

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    locationAccess: false,
  });
  const [errors, setErrors] = useState({});
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Force dark theme for auth pages
  useEffect(() => {
    document.body.style.backgroundColor = '#121212';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'locationAccess' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    setError(null);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Location access validation
    if (!formData.locationAccess) {
      newErrors.locationAccess = 'Location access is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (validateForm()) {
      try {
        // First check if username exists
        const usersCollectionRef = collection(db, 'users');
        const usernameQuery = query(usersCollectionRef, where('displayName', '==', formData.username));
        const usernameSnapshot = await getDocs(usernameQuery);

        if (!usernameSnapshot.empty) {
          setError('Username already exists. Please choose a different one.');
          setLoading(false);
          return;
        }

        // Create user account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        // Send verification email
        await sendEmailVerification(userCredential.user);

        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: formData.username,
          photoURL: '',
          createdAt: new Date(),
          emailVerified: false,
        });

        setVerificationSent(true);
        
      } catch (error) {
        console.error('Error in signup process:', error);
        setError(error.message || 'An error occurred during signup. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const handleLocationAccessGranted = async () => {
    setLocationModalOpen(false);
    setLoading(true);
    
    try {
      // Now create the user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      console.log('User signed up:', user);

      try {
        // First update the user's display name in Firebase Auth
        await updateProfile(user, {
          displayName: formData.username,
        });

        // Then create the user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: formData.username,
          photoURL: '',
          createdAt: new Date(),
        });

        console.log('User profile created:', {
          auth: {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
          },
          firestore: {
            displayName: formData.username
          }
        });

        setLoading(false);
        navigate('/home');
      } catch (firestoreError) {
        console.error('Error creating user profile in Firestore:', firestoreError);
        setError(`Failed to create user profile: ${firestoreError.message}`);
        setLoading(false);
      }
    } catch (authError) {
      console.error('Error signing up with Authentication:', authError);
      setError(authError.message);
      setLoading(false);
    }
  };

  const handleLocationAccessDenied = () => {
    setLocationModalOpen(false);
    setError('Location access is required to use Local Pulse. Please enable location services to continue.');
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <FullPage>
        <style>{`
          @keyframes scrollMarquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .angled-marquee-container {
            position: absolute;
            top: -600px;
            left: -600px;
            width: 250%;
            height: 250%;
            transform: rotate(-30deg);
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            opacity: 0.4;
          }
          .marquee-row {
            display: flex;
            width: max-content;
            animation: scrollMarquee 50s linear infinite;
            filter: brightness(1.1) contrast(1.1);
          }
          .marquee-image {
            width: 200px;
            height: 120px;
            object-fit: cover;
            margin-right: 48px;
            border-radius: 16px;
            flex-shrink: 0;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
            opacity: 0.75;
          }
          .marquee-row:nth-child(even) {
            animation-direction: reverse;
            animation-duration: 60s;
          }
          .marquee-row:nth-child(3n) {
            animation-duration: 80s;
          }
        `}</style>

        <div className="angled-marquee-container">
          {Array(12).fill(null).map((_, rowIndex) => (
            <div key={rowIndex} className="marquee-row">
              {Array(5).fill(marqueeImages).flat().map((src, i) => (
                <img
                  key={`${rowIndex}-${i}`}
                  src={src}
                  alt={`marquee-${rowIndex}-${i}`}
                  className="marquee-image"
                />
              ))}
            </div>
          ))}
        </div>

        <Box sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          overflow: 'hidden',
          maxWidth: 1000,
          width: '100%',
          height: { xs: 'auto', md: 500 },
          gap: 2,
        }}>
          <Box sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            bgcolor: '#e0e0e0',
            height: '100%',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <img src={placeholderImage} alt="Sign Up Background 1" style={{
              height: '50%',
              width: '100%',
              objectFit: 'cover',
            }} />
            <img src={placeholderImage2} alt="Sign Up Background 2" style={{
              height: '50%',
              width: '100%',
              objectFit: 'cover',
            }} />
          </Box>

          <FormContainer elevation={3} sx={{ height: { xs: 'auto', md: 500 } }}>
            <Typography component="h1" variant="h5" gutterBottom sx={{ color: '#fff' }}>
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
              Join Local Pulse to start sharing your experiences
            </Typography>

            {verificationSent ? (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Verification email sent! Please check your email to verify your account.
                </Alert>
                <Typography variant="body1" gutterBottom sx={{ color: '#fff' }}>
                  We've sent a verification link to {formData.email}
                </Typography>
                <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
                  Please click the link in the email to verify your account. If you don't see the email, check your spam folder.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate('/signin')}
                  sx={{ mt: 2 }}
                >
                  Go to Sign In
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12}>
                    <TextField
                      size="small"
                      required 
                      fullWidth 
                      id="email" 
                      label="Email" 
                      name="email"
                      value={formData.email} 
                      onChange={handleChange}
                      error={!!errors.email} 
                      helperText={errors.email}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                          color: '#fff',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      size="small"
                      required 
                      fullWidth 
                      id="username" 
                      label="Username" 
                      name="username"
                      value={formData.username} 
                      onChange={handleChange}
                      error={!!errors.username || (error && error.includes('Username already exists'))}
                      helperText={errors.username || (error && error.includes('Username already exists') ? error : '')}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                          color: '#fff',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      size="small"
                      required 
                      fullWidth 
                      name="password" 
                      label="Password" 
                      type={showPassword ? 'text' : 'password'}
                      id="password" 
                      value={formData.password} 
                      onChange={handleChange}
                      error={!!errors.password} 
                      helperText={errors.password}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                          color: '#fff',
                        },
                      }}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            disabled={loading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      size="small"
                      required 
                      fullWidth 
                      name="confirmPassword" 
                      label="Confirm Password" 
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword" 
                      value={formData.confirmPassword} 
                      onChange={handleChange}
                      error={!!errors.confirmPassword} 
                      helperText={errors.confirmPassword}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.23)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.7)',
                        },
                        '& .MuiInputBase-input': {
                          color: '#fff',
                        },
                      }}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                            disabled={loading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.locationAccess}
                            onChange={handleChange}
                            name="locationAccess"
                            required
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              '&.Mui-checked': {
                                color: 'primary.main',
                              },
                            }}
                          />
                        }
                        label="I agree to share my location"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      />
                      <Tooltip title="Location access is required to show you relevant posts and events in your area. This helps create a more personalized and local experience.">
                        <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {errors.locationAccess && (
                      <Typography color="error" variant="caption" sx={{ ml: 2 }}>
                        {errors.locationAccess}
                      </Typography>
                    )}
                  </Grid>
                </Grid>

                {error && (
                  <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                    {error}
                  </Typography>
                )}

                <Button 
                  type="submit" 
                  fullWidth 
                  variant="contained" 
                  sx={{ mt: 3, mb: 1, py: 1 }}
                  disabled={loading || !formData.locationAccess}
                >
                  {loading ? 'Signing Up...' : 'Sign Up'}
                </Button>

                <Box textAlign="center">
                  <Link component={RouterLink} to="/signin" variant="body2" sx={{ color: '#ddd' }}>
                    Already have an account? Sign In
                  </Link>
                </Box>
              </Box>
            )}
          </FormContainer>
        </Box>

        <Dialog
          open={locationModalOpen}
          aria-labelledby="location-dialog-title"
          aria-describedby="location-dialog-description"
        >
          <DialogTitle id="location-dialog-title">Location Access Required</DialogTitle>
          <DialogContent>
            <DialogContentText id="location-dialog-description">
              Local Pulse requires access to your location to show you relevant content and ensure a personalized experience. Location services must be enabled to continue.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleLocationAccessDenied} color="error">Cancel</Button>
            <Button onClick={handleLocationAccessGranted} variant="contained">Enable Location</Button>
          </DialogActions>
        </Dialog>
      </FullPage>
    </ThemeProvider>
  );
};

export default SignUp;
 