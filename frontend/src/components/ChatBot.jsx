import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  InputBase,
  IconButton,
  Avatar,
  Toolbar,
  Divider,
} from '@mui/material';
import { Send as SendIcon, Close as CloseIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import AIImage from '../assets/onboarding/step3-3.png';
import { useAuth } from '../contexts/AuthContext';

// Configure axios base URL - replace with your actual API URL
const API_BASE_URL= process.env.REACT_APP_API_URL || 'https://chatbot-g2plvgg63a-el.a.run.app';  // Change this to your FastAPI server URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Enable cookies for session management
});

const MessageBubble = styled(Paper)(({ theme, isUser }) => ({
  display: 'inline-block',
  padding: theme.spacing(1.5),
  maxWidth: '80%',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.grey[300],
  color: theme.palette.getContrastText(
    isUser ? theme.palette.primary.light : theme.palette.grey[300]
  ),
  borderRadius: isUser ? '15px 15px 0 15px' : '15px 15px 15px 0',
  marginBottom: theme.spacing(1),
}));

const ChatBot = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const { currentUser } = useAuth();

  // Get user's location when component mounts
  useEffect(() => {
    setIsLocationLoading(true);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsLocationLoading(false);
          
          // Add welcome message when location is obtained
          setMessages(prev => [...prev, {
            text: "Hello! I can help you with weather information, maps, and general questions. Your location has been detected for better assistance.",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Use default coordinates (Kolkata, West Bengal, India - matching your user location)
          setUserLocation({
            latitude: 22.560768,
            longitude: 88.375296
          });
          setIsLocationLoading(false);
          
          // Add a message to inform user about location access
          setMessages(prev => [...prev, {
            text: "I couldn't access your precise location, so I'm using Kolkata as the default location. Some location-based features might be limited. You can still ask me general questions!",
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      // Geolocation not supported
      setUserLocation({
        latitude: 22.560768,
        longitude: 88.375296
      });
      setIsLocationLoading(false);
      
      setMessages(prev => [...prev, {
        text: "Geolocation is not supported by your browser. Using Kolkata as default location. I can still help with general questions!",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await api.get('/health');
        console.log('API Health Check:', response.data);
      } catch (error) {
        console.error('API Connection Test Failed:', error);
        // Add error message to chat
        setMessages(prev => [...prev, {
          text: "⚠️ Unable to connect to the AI service. Please check if the server is running and try again.",
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    };

    testConnection();
  }, []);

const handleSendMessage = async () => {
  if (inputMessage.trim() === '' || !userLocation || isLocationLoading) return;

  const userMessage = {
    text: inputMessage,
    sender: 'user',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  setMessages(prev => [...prev, userMessage]);
  setInputMessage('');
  setIsLoading(true);

  try {
    // Prepare params with correct naming
    const params = {
      question: userMessage.text,
      lat: userLocation.latitude,
      long: userLocation.longitude
    };
    if (currentUser?.uid) {
      params.user_id = currentUser.uid; // Use user_id to match backend
    }

    // Axios POST with null body and query params
    const response = await api.post('/chat', null, { params });

    if (response.status === 200 && response.data && response.data.response) {
      const botMessage = {
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    let errorMessage = "An unexpected error occurred. Please try again.";
    if (error.response) {
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.status === 422) {
        errorMessage = "Please check your input. Make sure your question is valid.";
      } else if (error.response.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (error.response.status === 404) {
        errorMessage = "API endpoint not found. Please check the server configuration.";
      }
    } else if (error.request) {
      errorMessage = "Unable to connect to the server. Please check your internet connection and ensure the API server is running.";
    }
    const botErrorMessage = {
      text: `❌ ${errorMessage}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, botErrorMessage]);
  } finally {
    setIsLoading(false);
  }
};



  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to clear chat history
  const clearChatHistory = async () => {
    try {
      const response = await api.delete('/user/history');
      console.log('Clear history response:', response.data);
      
      setMessages([{
        text: "Chat history has been cleared. How can I help you today?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error('Error clearing history:', error);
      setMessages(prev => [...prev, {
        text: "❌ Failed to clear chat history. Please try again.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  // Function to load conversation history
  const loadConversationHistory = async () => {
    try {
      const response = await api.get('/user/history');
      console.log('Load history response:', response.data);
      
      if (response.data && response.data.status === 'success' && response.data.history) {
        const history = response.data.history;
        const loadedMessages = [];
        
        for (const entry of history) {
          if (entry.role === 'user') {
            loadedMessages.push({
              text: entry.parts[0].text,
              sender: 'user',
              timestamp: 'Previous'
            });
          } else if (entry.role === 'model') {
            loadedMessages.push({
              text: entry.parts[0].text,
              sender: 'bot',
              timestamp: 'Previous'
            });
          }
        }
        
        if (loadedMessages.length > 0) {
          setMessages(prev => [
            ...loadedMessages,
            {
              text: "--- Previous conversation loaded ---",
              sender: 'bot',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            },
            ...prev
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
      // Don't show error message for history loading failure
    }
  };

  // Load history when component mounts (after location is set)
  useEffect(() => {
    if (userLocation && !isLocationLoading) {
      loadConversationHistory();
    }
  }, [userLocation, isLocationLoading]);

  const canSendMessage = inputMessage.trim() !== '' && !isLoading && userLocation && !isLocationLoading;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      <Toolbar variant="dense" sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
        <Avatar src={AIImage} sx={{ mr: 1 }} />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          AI Assistant
        </Typography>
        <IconButton 
          onClick={clearChatHistory} 
          size="small" 
          sx={{ color: 'text.secondary', mr: 1 }}
          title="Clear Chat History"
        >
          🗑️
        </IconButton>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.primary' }}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      
      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          overflowY: 'auto',
          bgcolor: 'background.default',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: theme => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            },
          },
        }}
      >
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              mb: 1,
              textAlign: message.sender === 'user' ? 'right' : 'left',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.5 }}
            >
              {message.timestamp}
            </Typography>
            <MessageBubble variant="outlined" isUser={message.sender === 'user'}>
              {message.text}
            </MessageBubble>
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ textAlign: 'left', mb: 1 }}>
            <MessageBubble variant="outlined" isUser={false}>
              Typing...
            </MessageBubble>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.default', borderRadius: 2, px: 1 }}>
          <InputBase
            placeholder="Type a message..."
            fullWidth
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || !userLocation || isLocationLoading}
            sx={{ mr: 1, p: '8px 12px', bgcolor: 'background.paper', borderRadius: 2, color: 'text.primary' }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!canSendMessage}
          >
            <SendIcon />
          </IconButton>
        </Box>
        {isLocationLoading && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            📍 Getting your location...
          </Typography>
        )}
        {!userLocation && !isLocationLoading && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            ⚠️ Location access required for full functionality
          </Typography>
        )}
        {userLocation && !isLocationLoading && (
          <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
            📍 Location detected: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ChatBot;