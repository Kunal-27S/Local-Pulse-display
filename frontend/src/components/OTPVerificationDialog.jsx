import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { verifyOTP } from '../services/emailService';

const OTPVerificationDialog = ({ open, email, onClose, onVerificationSuccess, onResendOTP }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (open && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [open, timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);

    try {
      const result = verifyOTP(email, otp);
      if (result.isValid) {
        onVerificationSuccess();
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Error verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimeLeft(600);
    setOtp('');
    setError('');
    onResendOTP();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Email Verification</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Please enter the verification code sent to:
          </Typography>
          <Typography variant="body1" fontWeight="bold" gutterBottom>
            {email}
          </Typography>
          <TextField
            fullWidth
            label="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            margin="normal"
            inputProps={{ maxLength: 6 }}
            error={!!error}
            helperText={error}
            disabled={loading}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Time remaining: {formatTime(timeLeft)}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleResend}
          disabled={timeLeft > 0 || loading}
          color="secondary"
        >
          Resend Code
        </Button>
        <Button
          onClick={handleVerify}
          variant="contained"
          disabled={otp.length !== 6 || loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OTPVerificationDialog; 