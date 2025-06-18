import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import app from '../firebaseConfig';

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in session storage with expiry
export const storeOTP = (email, otp) => {
  const expiryTime = new Date().getTime() + 10 * 60 * 1000; // 10 minutes expiry
  const otpData = {
    otp,
    expiry: expiryTime,
  };
  sessionStorage.setItem(`otp_${email}`, JSON.stringify(otpData));
};

// Verify OTP
export const verifyOTP = (email, userEnteredOTP) => {
  const storedOTPData = sessionStorage.getItem(`otp_${email}`);
  if (!storedOTPData) return false;

  const { otp, expiry } = JSON.parse(storedOTPData);
  const currentTime = new Date().getTime();

  if (currentTime > expiry) {
    sessionStorage.removeItem(`otp_${email}`);
    return { isValid: false, error: 'OTP has expired' };
  }

  if (otp === userEnteredOTP) {
    sessionStorage.removeItem(`otp_${email}`);
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid OTP' };
};

// Send OTP email using Firebase Cloud Functions
export const sendOTPEmail = async (email, otp) => {
  try {
    const functions = getFunctions(app);
    const sendEmailFunction = httpsCallable(functions, 'sendOTPEmail');
    const result = await sendEmailFunction({ email, otp });
    
    if (result.data && result.data.success) {
      return true;
    } else {
      throw new Error('Failed to send verification email');
    }
  } catch (error) {
    console.error('Error sending OTP email:', error);
    if (error.code === 'functions/not-found') {
      throw new Error('Email service not properly configured. Please contact support.');
    } else if (error.code === 'functions/unauthenticated') {
      throw new Error('Authentication required. Please try again.');
    } else {
      throw new Error(error.message || 'Failed to send verification email');
    }
  }
}; 