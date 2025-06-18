import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Paper,
  Dialog,
  DialogContent,
  Grid,
  useTheme,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import CardSwap, { Card } from './CardSwap';

import connectImage from '../assets/onboarding/connect.jpg';
import communityImage from '../assets/onboarding/community.jpg';
import informImage from '../assets/onboarding/inform.jpg';
import step2_1 from '../assets/onboarding/step2-1.png';
import step2_2 from '../assets/onboarding/step2-2.png';
import step2_3 from '../assets/onboarding/step2-3.png';
import step3_1 from '../assets/onboarding/step3-1.png';
import step3_2 from '../assets/onboarding/step3-2.png';
import step3_3 from '../assets/onboarding/step3-3.png';



const steps = ['Welcome', 'Discover', 'Connect', 'Complete'];

const OnboardingStepper = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const theme = useTheme();
  const { currentUser } = useAuth();

  const handleNext = async () => {
    if (activeStep === 0 && !nickname.trim()) return;
    
    if (activeStep === 0) {
      // Update nickname in Firestore
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          nickname: nickname.trim()
        });
      } catch (error) {
        console.error('Error updating nickname:', error);
      }
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleComplete = () => {
    onClose();
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 4, position: 'relative', minHeight: '500px' }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  height: '100%',
                  pr: { md: 4 }
                }}>
                  <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    Welcome to Local Pulse!
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
                    Join your local community and start sharing experiences. First, let's personalize your profile.
                  </Typography>
                  <TextField
                    fullWidth
                    label="Choose your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    sx={{ mb: 2 }}
                    placeholder="Enter a nickname that represents you"
                    helperText="This is how others will see you in the community"
                    size="large"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6} sx={{ position: 'relative' }}>
                <Box sx={{
                  height: '400px',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: '50px',
                }}>
                  <CardSwap
                    width={450}
                    height={450}
                    cardDistance={40}
                    verticalDistance={15}
                    delay={3000}
                    pauseOnHover
                    skewAmount={4}
                    easing="power1"
                  >
                    <Card>
                      <img 
                        src={connectImage}
                        alt="Connect"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '16px',
                          imageRendering: 'high-quality', // Force high-quality rendering
                          transform: 'translateZ(0)', // Force hardware acceleration
                          backfaceVisibility: 'hidden', // Improve performance
                          WebkitFontSmoothing: 'antialiased', // Better text/edge rendering
                        }}
                      />
                    </Card>
                    <Card>
                      <img 
                        src={communityImage}
                        alt="Community"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '16px',
                        }}
                      />
                    </Card>
                    <Card>
                      <img 
                        src={informImage}
                        alt="Inform"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '16px',
                        }}
                      />
                    </Card>
                  </CardSwap>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ p: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Locality based
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400 }}>
                  Get personalized feed based on your location. You only see things that are happening close to you, in your community/locality, thus making it more relevant and useful for you.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Box
                    component="img"
                    src={step2_1}
                    alt="Locality Based Feed Illustration"
                    sx={{
                      height: '300px',
                      width: '300px',
                      borderRadius: 2,
                      boxShadow: 3,
                      marginLeft: '100px'
                    }}
                  />
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Box
                    component="img"
                    src={step2_2}
                    alt="Auto Deletion Illustration"
                    sx={{
                      height: '300px',
                      width: '300px',
                      borderRadius: 2,
                      boxShadow: 3,
                      marginLeft: '80px'
                    }}
                  />
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Auto deletion of posts
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400 }}>
                  To add to the relevance of the posts, users are required to select the amount of time they want the post to remain, from 1 all the way to 24 hours(repostable even after that).
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Connect with Neighbors
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400 }}>
                  Connect with your fellow locality members. Chat with them, share your thoughts, and get to know them.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Box
                    component="img"
                    src={step2_3}
                    alt="Connect Illustration"
                    sx={{
                      height: '300px',
                      width: '300px',
                      borderRadius: 2,
                      boxShadow: 3,
                      marginLeft: '100px'
                    }}
                  />
                </motion.div>
              </Grid>
            </Grid>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ p: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Create and interact with posts
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400 }}>
                  Create new posts, like, mark as eye witnessed, comment, share, etc to other's posts. Use the Explore tab to explore trendy topics from over the world.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Box
                    component="img"
                    src={step3_1}
                    alt="Locality Based Feed Illustration"
                    sx={{
                      height: '300px',
                      width: '300px',
                      borderRadius: 2,
                      boxShadow: 3,
                      marginLeft: '100px'
                    }}
                  />
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Box
                    component="img"
                    src={step3_2}
                    alt="Auto Deletion Illustration"
                    sx={{
                      height: '300px',
                      width: '300px',
                      borderRadius: 2,
                      boxShadow: 3,
                      marginLeft: '80px'
                    }}
                  />
                </motion.div>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Chat and meet other people
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400 }}>
                  Search up users in the Chat section and chat with them. That is a great way to meet new people in your locality and afar.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Ask our Advanced AI
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 400 }}>
                  Ask our AI chatbot about posts, current affairs, local news, traffic, cafes, restaurants, musicians, etc, and it responds keeping your location in mind.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Box
                    component="img"
                    src={step3_3}
                    alt="Connect Illustration"
                    sx={{
                      height: '300px',
                      width: '300px',
                      borderRadius: 2,
                      boxShadow: 3,
                      marginLeft: '100px'
                    }}
                  />
                </motion.div>
              </Grid>
            </Grid>
          </Box>
        );
      case 3:
        return (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
              You're All Set!
            </Typography>
            <Typography variant="h5" sx={{ mb: 3, color: 'text.secondary' }}>
              Experience the local pulse and become a part of it
            </Typography>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: theme.palette.background.paper,
          minHeight: '80vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stepper activeStep={activeStep} sx={{ p: 4, bgcolor: 'background.default' }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {getStepContent(activeStep)}
          </motion.div>
        </AnimatePresence>
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            sx={{ visibility: activeStep === 0 ? 'hidden' : 'visible' }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={activeStep === steps.length - 1 ? handleComplete : handleNext}
            disabled={activeStep === 0 && !nickname.trim()}
            sx={{
              bgcolor: activeStep === 0 && !nickname.trim() ? 'action.disabled' : 'primary.main',
              '&:hover': {
                bgcolor: activeStep === 0 && !nickname.trim() ? 'action.disabled' : 'primary.dark',
              },
            }}
          >
            {activeStep === steps.length - 1 ? 'Complete' : 'Continue'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingStepper;