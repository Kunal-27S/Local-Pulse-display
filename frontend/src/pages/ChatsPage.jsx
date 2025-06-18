import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Badge,
  Paper,
  CircularProgress,
  Fab,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  where,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const ChatsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [errorChats, setErrorChats] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [errorSearch, setErrorSearch] = useState(null);

  const [initiatingChat, setInitiatingChat] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoadingChats(false);
      return;
    }

    const chatsCollectionRef = collection(db, 'users', currentUser.uid, 'chats');
    const chatsQuery = query(chatsCollectionRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      chatsQuery,
      async (snapshot) => {
        const chatsData = await Promise.all(snapshot.docs.map(async (chatDocSnap) => {
          const chat = { id: chatDocSnap.id, ...chatDocSnap.data() };

          let otherUser = { name: 'Unknown User', avatar: '' };
          if (chat.otherUserId) {
            try {
              const userDocRef = doc(db, 'users', chat.otherUserId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                otherUser = {
                  name: userData.displayName || userData.email || 'Unknown User',
                  avatar: userData.photoURL || '',
                };
              }
            } catch (err) {
              console.error('Error fetching other user details:', err);
            }
          }

          return {
            ...chat,
            user: otherUser,
          };
        }));

        setChats(chatsData);
        setLoadingChats(false);
      },
      err => {
        console.error('Error fetching chats:', err);
        setErrorChats('Failed to load chats.');
        setLoadingChats(false);
      }
    );

    return () => unsubscribe();

  }, [currentUser]);

  const handleSearch = async () => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    setErrorSearch(null);
    setSearchResults([]);

    try {
      const usersRef = collection(db, 'users');
      // Remove the where clauses to get all users and filter in memory
      const querySnapshot = await getDocs(usersRef);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Filter users based on case-insensitive search
      const searchTermLower = searchTerm.toLowerCase().trim();
      const filteredUsers = users.filter(user => {
        const displayName = (user.displayName || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return (user.id !== currentUser.uid) && 
               (displayName.includes(searchTermLower) || 
                email.includes(searchTermLower));
      });

      // Sort results by relevance (exact matches first, then partial matches)
      const sortedUsers = filteredUsers.sort((a, b) => {
        const aName = (a.displayName || '').toLowerCase();
        const bName = (b.displayName || '').toLowerCase();
        const aEmail = (a.email || '').toLowerCase();
        const bEmail = (b.email || '').toLowerCase();
        
        const aStartsWith = aName.startsWith(searchTermLower) || aEmail.startsWith(searchTermLower);
        const bStartsWith = bName.startsWith(searchTermLower) || bEmail.startsWith(searchTermLower);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return 0;
      });

      setSearchResults(sortedUsers);

    } catch (err) {
      console.error('Error searching users:', err);
      setErrorSearch('Failed to search for users.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Add debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim() !== '') {
        handleSearch();
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleUserClick = async (otherUser) => {
    if (!currentUser || !otherUser || initiatingChat) return;

    setInitiatingChat(true);
    console.log('Starting chat initiation with user:', otherUser.id);

    try {
      // Check for existing chat first
      const chatsRef = collection(db, 'users', currentUser.uid, 'chats');
      const existingChatQuery = query(chatsRef, where('otherUserId', '==', otherUser.id));
      const existingChatSnapshot = await getDocs(existingChatQuery);

      if (!existingChatSnapshot.empty) {
        const existingChatId = existingChatSnapshot.docs[0].id;
        console.log('Found existing chat:', existingChatId);
        navigate(`/chats/${existingChatId}`);
        return;
      }

      // Create new chat with deterministic ID
      const newChatId = [currentUser.uid, otherUser.id].sort().join('_');
      console.log('Creating new chat with ID:', newChatId);

      // Prepare chat data - EXACTLY 6 fields as required by security rules
      const currentUserChatData = {
        otherUserId: otherUser.id,
        participants: [currentUser.uid, otherUser.id],
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        lastMessage: null,
        unreadCount: 0
      };

      const otherUserChatData = {
        otherUserId: currentUser.uid,
        participants: [currentUser.uid, otherUser.id],
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(),
        lastMessage: null,
        unreadCount: 0
      };

      console.log('Chat data for current user:', currentUserChatData);

      // Use setDoc with the specific document ID instead of addDoc
      try {
        await setDoc(
          doc(db, 'users', currentUser.uid, 'chats', newChatId), 
          currentUserChatData
        );
        console.log('Successfully created chat in current user subcollection');
      } catch (error) {
        console.error('Error creating chat in current user subcollection:', error);
        throw error;
      }

      // Create chat document in other user's subcollection
      console.log('Chat data for other user:', otherUserChatData);

      try {
        await setDoc(
          doc(db, 'users', otherUser.id, 'chats', newChatId), 
          otherUserChatData
        );
        console.log('Successfully created chat in other user subcollection');
      } catch (error) {
        console.error('Error creating chat in other user subcollection:', error);
        
        // Clean up the first document if the second fails
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'chats', newChatId));
          console.log('Cleaned up current user chat document after failure');
        } catch (cleanupError) {
          console.error('Failed to clean up current user chat document:', cleanupError);
        }
        
        throw error;
      }

      // Navigate to the chat
      navigate(`/chats/${newChatId}`);

    } catch (err) {
      console.error('Error initiating chat:', err);
      console.error('Full error object:', {
        code: err.code,
        message: err.message,
        details: err.details,
        stack: err.stack
      });
      
      // Show user-friendly error
      alert(`Failed to start chat: ${err.message || 'Unknown error'}`);
    } finally {
      setInitiatingChat(false);
    }
  };

  const handleChatClick = (chatId) => {
    navigate(`/chats/${chatId}`);
  };

  const displaySearchResults = searchTerm.trim() !== '' || loadingSearch || errorSearch;

  if (loadingChats) {
    return (
      <Container maxWidth="sm" sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6">Loading chats...</Typography>
      </Container>
    );
  }

  if (errorChats) {
    return (
      <Container maxWidth="sm" sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">{errorChats}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Chats
      </Typography>

      {/* Search bar - now always visible */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Search users to chat"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {loadingSearch ? (
                  <CircularProgress size={20} />
                ) : (
                  <IconButton onClick={handleSearch} edge="end">
                    <SearchIcon />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          helperText="Search by name or email"
        />
      </Box>

      {/* Search results or chat list */}
      {displaySearchResults ? (
        // Show search results
        loadingSearch ? (
          <Box sx={{ textAlign: 'center' }}><CircularProgress /></Box>
        ) : errorSearch ? (
          <Typography color="error" textAlign="center">{errorSearch}</Typography>
        ) : searchResults.length > 0 ? (
          <List component={Paper} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {searchResults.map(user => (
              <ListItem button key={user.id} onClick={() => handleUserClick(user)} divider disabled={initiatingChat}>
                <ListItemAvatar>
                  <Avatar src={user.photoURL || ''} alt={user.displayName} />
                </ListItemAvatar>
                <ListItemText 
                  primary={user.displayName || 'Anonymous User'} 
                  secondary={user.nickname ? `@${user.nickname}` : ''} 
                />
              </ListItem>
            ))}
          </List>
        ) : searchTerm.trim() !== '' && !loadingSearch && (
          <Typography textAlign="center">No users found for this search term.</Typography>
        )
      ) : (
        // Show existing chats or empty state
        chats.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No chats yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Use the search bar above to find users and start chatting
            </Typography>
          </Box>
        ) : (
          <List sx={{ mt: 2 }}>
            {chats.map((chat) => (
              <Paper
                key={chat.id}
                elevation={2}
                sx={{
                  mb: 2,
                  borderRadius: 3,
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  transition: '0.2s',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    boxShadow: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
                onClick={() => handleChatClick(chat.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ListItemAvatar>
                    <Badge
                      color="error"
                      badgeContent={chat.unreadCount || 0}
                      invisible={!chat.unreadCount || chat.unreadCount === 0}
                      overlap="circular"
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      <Avatar alt={chat.user.name} src={chat.user.avatar} />
                    </Badge>
                  </ListItemAvatar>

                  <Box sx={{ flexGrow: 1, ml: 2 }}>
                    <Typography variant="subtitle1" fontWeight={500} color="text.primary">
                      {chat.user.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ maxWidth: '260px' }}
                    >
                      {chat.lastMessage ? (
                        chat.lastMessage.mediaType ? (
                          chat.lastMessage.mediaType === 'image' ? '📷 Image' : '🎥 Video'
                        ) : (
                          chat.lastMessage.text || 'No messages yet.'
                        )
                      ) : (
                        'No messages yet.'
                      )}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">
                      {chat.timestamp?.toDate().toLocaleString() || ''}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </List>
        )
      )}
    </Container>
  );
};

export default ChatsPage;