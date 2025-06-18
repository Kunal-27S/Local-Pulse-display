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
  IconButton,
  Alert,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import placeholderImage from '../assets/signin.png';
import { Visibility, VisibilityOff } from '@mui/icons-material';

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

const marqueeImages = [
  '/assets/marquee/image1.png',
  '/assets/marquee/image2.png',
  '/assets/marquee/image3.png',
  '/assets/marquee/image4.png',
  '/assets/marquee/image5.png',
  '/assets/marquee/image6.png',
];

const FullPage = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  minHeight: '100vh',
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#e0f7fa',
  backgroundImage: theme.palette.mode === 'dark' ? 'none' : 'linear-gradient(135deg, #e0f7fa 0%, #80deea 100%)',
  color: theme.palette.text.primary,
}));

const FormContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 0,
  maxWidth: 'initial',
  width: 'auto',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: 400,
  borderRadius: theme.spacing(2),
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(18, 18, 18, 0.8)' : 'rgba(255, 255, 255, 0.9)',
  boxShadow: theme.shadows[5],
  zIndex: 1,
  position: 'relative',
}));

const SignIn = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Add cooldown timer effect
  useEffect(() => {
    let timer;
    if (cooldownTime > 0) {
      timer = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownTime]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleResendVerification = async () => {
    if (cooldownTime > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      if (unverifiedUser) {
        await sendEmailVerification(unverifiedUser);
        setVerificationSent(true);
        setError('A new verification email has been sent. Please check your inbox.');
        setCooldownTime(60); // Set 60 second cooldown
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      let errorMessage = 'Failed to send verification email. ';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage += 'Too many attempts. Please wait a few minutes before trying again.';
        setCooldownTime(300); // Set 5 minute cooldown for too many requests
      } else if (error.code === 'auth/user-not-found') {
        errorMessage += 'User not found. Please sign up first.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += 'Invalid email address.';
      } else {
        errorMessage += 'Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setVerificationSent(false);
    setUnverifiedUser(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        setUnverifiedUser(user);
        setError('Please verify your email address before signing in. Check your inbox for the verification link.');
        return;
      }

      // Clear any stored data from previous sessions
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cached data
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (err) {
          console.error('Error clearing cache:', err);
        }
      }

      // Set up navigation prevention and redirect
      window.history.replaceState(null, '', '/home');
      window.history.pushState(null, '', '/home');
      
      // Prevent back navigation to login page
      window.onpopstate = function() {
        window.history.forward();
        window.history.pushState(null, '', '/home');
      };

      // Get the redirect path from session storage, default to home if none exists
      const redirectPath = sessionStorage.getItem('redirectAfterSignIn') || 'home';
      sessionStorage.removeItem('redirectAfterSignIn'); // Clear the stored path
      navigate('/' + redirectPath, { replace: true });

    } catch (error) {
      console.error('Error signing in:', error);
      let errorMessage = 'Failed to sign in. ';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      
      setError(errorMessage);
    }
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
          flexDirection: 'row',
          alignItems: 'stretch',
          borderRadius: theme.spacing(2),
          overflow: 'hidden',
          maxWidth: 800,
          width: '100%',
        }}>
          <Box sx={{
            flex: 1,
            display: { xs: 'none', md: 'block' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#e0e0e0',
          }}>
            <img src={placeholderImage} alt="Sign In Background" style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }} />
          </Box>

          <FormContainer>
            <StyledPaper elevation={0}>
              <Typography component="h1" variant="h5" gutterBottom>
                Welcome Back
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 2 }}>
                Sign in to continue to your dashboard
              </Typography>
              {error && (
                <Alert 
                  severity={error.includes('verification email has been sent') ? 'success' : 'error'}
                  sx={{ width: '100%', mb: 2 }}
                >
                  {error}
                </Alert>
              )}
              <Box component="form" onSubmit={handleSignIn} sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                  error={!!error && !verificationSent}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!error}
                  helperText={error}
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
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
                {unverifiedUser && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      onClick={handleResendVerification}
                      disabled={cooldownTime > 0 || isResending}
                      variant="outlined"
                      color="primary"
                      fullWidth
                    >
                      {isResending ? 'Sending...' : 
                       cooldownTime > 0 ? 
                       `Resend verification (${cooldownTime}s)` : 
                       'Resend verification email'}
                    </Button>
                  </Box>
                )}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  Sign In
                </Button>
                <Box textAlign="center">
                  <Link component={RouterLink} to="/signup" variant="body2" sx={{ color: '#ddd' }}>
                    {"Don't have an account? Sign Up"}
                  </Link>
                </Box>
              </Box>
            </StyledPaper>
          </FormContainer>
        </Box>
      </FullPage>
    </ThemeProvider>
  );
};

export default SignIn;
