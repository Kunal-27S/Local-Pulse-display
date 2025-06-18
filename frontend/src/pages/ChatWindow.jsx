import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  InputBase,
  IconButton,
  Avatar,
  Container,
  Fab,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Image as ImageIcon,
  Videocam as VideoIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  onSnapshot,
  query,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { uploadImage } from '../utils/storage';

const ChatWindow = () => {
  const theme = useTheme();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [chatPartner, setChatPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [hasScrolledToUnread, setHasScrolledToUnread] = useState(false);
  
  // Refs for scrolling
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch chat messages and chat partner info
  useEffect(() => {
    if (!currentUser || !chatId) {
      setLoading(false);
      return;
    }

    // Fetch chat partner info
    const fetchChatPartner = async () => {
        try {
            const chatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);

            if (chatDoc.exists()) {
                const chatData = chatDoc.data();
                const participantIds = chatData.participants;
                const otherParticipantId = participantIds.find(id => id !== currentUser.uid);

                if (otherParticipantId) {
                    const otherUserDoc = await getDoc(doc(db, 'users', otherParticipantId));
                    if (otherUserDoc.exists()) {
                        const otherUserData = otherUserDoc.data();
                         setChatPartner({
                            name: otherUserData.displayName || otherUserData.email || 'Unknown User',
                            avatar: otherUserData.photoURL || '',
                            id: otherUserDoc.id,
                         });
                    } else {
                         setChatPartner({ name: 'Unknown User', avatar: '' });
                    }
                } else {
                     setChatPartner({ name: 'Single User Chat', avatar: '' });
                }
            } else {
                 setError('Chat not found.');
                 setLoading(false);
                 return;
            }

        } catch (err) {
            console.error('Error fetching chat partner:', err);
             setError('Failed to load chat partner info.');
             setLoading(false);
             return;
        }
         setLoading(false);
    };

    // Setup real-time listener for messages
    const messagesRef = query(collection(db, 'users', currentUser.uid, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(messagesRef,
      snapshot => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          sender: doc.data().senderId === currentUser.uid ? 'user' : 'other',
        }));
        setMessages(messagesData);
      },
      err => {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages.');
      }
    );

     fetchChatPartner();

    return () => unsubscribe();

  }, [chatId, currentUser]);

  // Enhanced scrolling logic
  useEffect(() => {
    if (messages.length === 0 || loading) return;

    const scrollToTarget = () => {
      if (!messagesContainerRef.current) return;

      // Only scroll to unread on initial load
      if (!hasScrolledToUnread) {
        // Find the first unread message from the other user
        const firstUnreadIndex = messages.findIndex(msg => 
          msg.sender === 'other' && !msg.read
        );

        if (firstUnreadIndex !== -1) {
          // Found unread messages, scroll to first unread
          const messageElements = messagesContainerRef.current.querySelectorAll('[data-message-id]');
          if (messageElements[firstUnreadIndex]) {
            messageElements[firstUnreadIndex].scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
            setHasScrolledToUnread(true);
            return;
          }
        }
        
        // No unread messages or couldn't find element, scroll to bottom
        scrollToBottom('smooth');
        setHasScrolledToUnread(true);
      } else {
        // After initial scroll, always scroll to bottom for new messages
        scrollToBottom('smooth');
      }
    };

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      setTimeout(scrollToTarget, 50);
    });
  }, [messages, loading, hasScrolledToUnread]);

  // Function to scroll to bottom
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Reset unread count when chat is opened
  useEffect(() => {
    if (!currentUser || !chatId) return;

    const resetUnreadCount = async () => {
      try {
        const currentUserChatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
        await updateDoc(currentUserChatRef, {
          unreadCount: 0
        });

        // Mark messages as read
        const messagesRef = collection(db, 'users', currentUser.uid, 'chats', chatId, 'messages');
        const unreadMessages = messages.filter(msg => msg.sender === 'other' && !msg.read);
        
        // Update each unread message to mark as read
        const updatePromises = unreadMessages.map(msg => 
          updateDoc(doc(messagesRef, msg.id), { read: true })
        );
        
        await Promise.all(updatePromises);
      } catch (err) {
        console.error('Error resetting unread count:', err);
      }
    };

    resetUnreadCount();
  }, [currentUser, chatId, messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || !currentUser || !chatId || !chatPartner) return;
  
    try {
      const messageText = inputMessage.trim();
      const messageTimestamp = serverTimestamp();
  
      const newMessage = {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Anonymous',
        timestamp: messageTimestamp,
        read: false,
      };
  
      await Promise.all([
        addDoc(collection(db, 'users', currentUser.uid, 'chats', chatId, 'messages'), newMessage),
        addDoc(collection(db, 'users', chatPartner.id, 'chats', chatId, 'messages'), newMessage)
      ]);
  
      const currentUserChatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
      await updateDoc(currentUserChatRef, {
        lastMessage: { text: messageText, senderId: currentUser.uid },
        timestamp: messageTimestamp,
      });
  
      const otherUserChatRef = doc(db, 'users', chatPartner.id, 'chats', chatId);
      await updateDoc(otherUserChatRef, {
        lastMessage: { text: messageText, senderId: currentUser.uid },
        timestamp: messageTimestamp,
        unreadCount: increment(1)
      });
  
      setInputMessage('');
  
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleBackClick = () => navigate(-1);
  
  const handleProfileClick = () => {
    if (chatPartner?.id) {
      navigate(`/profile/${chatPartner.id}`);
    }
  };

  const handleMediaUpload = async (file) => {
    if (!currentUser || !chatId || !chatPartner || !file) return;

    setUploadingMedia(true);
    try {
      // Determine if the file is a video
      const isVideo = file.type.startsWith('video/');
      
      // Upload to Firebase Storage
      const mediaUrl = await uploadImage(file, 'chats', currentUser.uid);

      const messageTimestamp = serverTimestamp();
      const newMessage = {
        text: '',
        mediaUrl: mediaUrl,
        mediaType: isVideo ? 'video' : 'image',
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Anonymous',
        timestamp: messageTimestamp,
        read: false,
      };

      // Write message to both users' chat subcollections
      await Promise.all([
        addDoc(collection(db, 'users', currentUser.uid, 'chats', chatId, 'messages'), newMessage),
        addDoc(collection(db, 'users', chatPartner.id, 'chats', chatId, 'messages'), newMessage)
      ]);

      // Update chat documents
      const currentUserChatRef = doc(db, 'users', currentUser.uid, 'chats', chatId);
      const otherUserChatRef = doc(db, 'users', chatPartner.id, 'chats', chatId);

      await Promise.all([
        updateDoc(currentUserChatRef, {
          lastMessage: { mediaUrl, mediaType: newMessage.mediaType, senderId: currentUser.uid },
          timestamp: messageTimestamp,
        }),
        updateDoc(otherUserChatRef, {
          lastMessage: { mediaUrl, mediaType: newMessage.mediaType, senderId: currentUser.uid },
          timestamp: messageTimestamp,
          unreadCount: increment(1)
        })
      ]);

    } catch (err) {
      console.error('Error uploading media:', err);
    } finally {
      setUploadingMedia(false);
      setAnchorEl(null);
    }
  };

  const handleFloatingButtonClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleImageUpload = () => {
    fileInputRef.current.click();
    handleMenuClose();
  };

  const handleVideoUpload = () => {
    fileInputRef.current.click();
    handleMenuClose();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleMediaUpload(file);
    }
    event.target.value = '';
  };

   if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6">Loading chat...</Typography>
      </Container>
    );
  }

   if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          flexShrink: 0,
        }}
      >
        <IconButton edge="start" onClick={handleBackClick} sx={{ color: theme.palette.text.primary, mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box
          onClick={handleProfileClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexGrow: 1,
            cursor: chatPartner?.id ? 'pointer' : 'default',
          }}
        >
          <Avatar
            alt={chatPartner?.name || ''}
            src={chatPartner?.avatar || ''}
            sx={{ width: 32, height: 32, mr: 1 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
            {chatPartner?.name || 'Loading...'}
          </Typography>
        </Box>
      </Box>

      {/* Messages */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flexGrow: 1,
          p: 2,
          overflowY: 'auto',
          bgcolor: theme.palette.background.default,
        }}
      >
        {messages.map((message, index) => (
          <Box
            key={message.id}
            data-message-id={message.id}
            sx={{ 
              mb: 1, 
              textAlign: message.sender === 'user' ? 'right' : 'left',
              // Add visual indicator for unread messages
              position: 'relative',
              '&::before': message.sender === 'other' && !message.read ? {
                content: '""',
                position: 'absolute',
                left: -8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 4,
                height: '100%',
                bgcolor: theme.palette.primary.main,
                borderRadius: 2,
              } : {}
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5, display: 'block' }}
            >
              {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
            </Typography>
            <Paper
              sx={{
                display: 'inline-block',
                px: 2,
                py: 1,
                borderRadius: 3,
                bgcolor:
                  message.sender === 'user'
                    ? theme.palette.primary.main
                    : theme.palette.grey[300],
                color: theme.palette.getContrastText(
                  message.sender === 'user'
                    ? theme.palette.primary.main
                    : theme.palette.grey[300]
                ),
                maxWidth: '75%',
                boxShadow: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.mediaUrl && (
                <Box sx={{ mb: message.text ? 1 : 0 }}>
                  {message.mediaType === 'image' ? (
                    <img 
                      src={message.mediaUrl} 
                      alt="Shared media" 
                      style={{ maxWidth: '100%', borderRadius: 8 }}
                      loading="lazy"
                    />
                  ) : (
                    <video 
                      src={message.mediaUrl} 
                      controls 
                      style={{ maxWidth: '100%', borderRadius: 8 }}
                      preload="metadata"
                    />
                  )}
                </Box>
              )}
              {message.text}
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.background.paper,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: theme.palette.background.default,
            borderRadius: 2,
            px: 1,
          }}
        >
          <InputBase
            placeholder="Type a message..."
            fullWidth
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            sx={{
              mr: 1,
              p: '8px 12px',
              color: theme.palette.text.primary,
            }}
            inputProps={{
              style: { color: theme.palette.text.primary },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={inputMessage.trim() === ''}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,video/*"
        onChange={handleFileChange}
      />

      {/* Media Upload Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleImageUpload}>
          <ImageIcon sx={{ mr: 1 }} /> Upload Image
        </MenuItem>
        <MenuItem onClick={handleVideoUpload}>
          <VideoIcon sx={{ mr: 1 }} /> Upload Video
        </MenuItem>
      </Menu>

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 20,
          bgcolor: theme.palette.primary.main,
        }}
        onClick={handleFloatingButtonClick}
        disabled={uploadingMedia}
      >
        {uploadingMedia ? <CircularProgress size={24} color="inherit" /> : <AddIcon />}
      </Fab>
    </Container>
  );
};

export default ChatWindow;