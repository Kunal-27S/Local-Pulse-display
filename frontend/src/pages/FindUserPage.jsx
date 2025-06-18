import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Box,
  Paper,
} from '@mui/material';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const FindUserPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleSearch = async () => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      // Search for users by displayName (username)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('displayName', '>=', searchTerm.trim()), where('displayName', '<=', searchTerm.trim() + '\uf8ff'));
      
      const querySnapshot = await getDocs(q);
      
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setSearchResults(users);

    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search for users.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (otherUserId) => {
    if (!currentUser || !otherUserId) return;

    setLoading(true);

    try {
      // Check if a chat already exists between currentUser and otherUser
      // A chat between two users can be identified by a combination of their UIDs.
      // We can query the current user's chats subcollection.
      const chatsRef = collection(db, 'users', currentUser.uid, 'chats');
      // Query for a chat where the other participant is the clicked user
      const existingChatQuery = query(chatsRef, where('otherUserId', '==', otherUserId));
      const existingChatSnapshot = await getDocs(existingChatQuery);

      if (!existingChatSnapshot.empty) {
        // Chat already exists, navigate to it
        const existingChatId = existingChatSnapshot.docs[0].id;
        navigate(`/chats/${existingChatId}`);
      } else {
        // Chat does not exist, create a new one
        
        // 1. Create a new chat document in a top-level 'chats' collection (optional, for potential future features)
        // const newChatRef = await addDoc(collection(db, 'chats'), { // Optional top-level chat document
        //   participants: [currentUser.uid, otherUserId],
        //   createdAt: serverTimestamp(),
        // });
        // const newChatId = newChatRef.id;

        // For simplicity, let's use the chat ID as the current user's UID + other user's UID (sorted) for easy lookup
        // This approach works if chat IDs are consistently generated this way.
        // A more robust way is to query both users' chat subcollections or use a top-level chats collection.
        
        // A simpler approach: create chat documents in each user's subcollection directly
        const newChatId = [currentUser.uid, otherUserId].sort().join('_'); // Consistent chat ID format

        // Create chat document for current user
        await addDoc(collection(db, 'users', currentUser.uid, 'chats'), {
          otherUserId: otherUserId,
          participants: [currentUser.uid, otherUserId],
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(), // Timestamp for ordering chats
          lastMessage: null,
          unreadCount: 0,
          chatId: newChatId, // Store the generated chatId
        });

        // Create chat document for the other user
        await addDoc(collection(db, 'users', otherUserId, 'chats'), {
          otherUserId: currentUser.uid,
          participants: [currentUser.uid, otherUserId],
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp(),
          lastMessage: null,
          unreadCount: 0,
          chatId: newChatId, // Store the generated chatId
        });

        // Navigate to the new chat window
        navigate(`/chats/${newChatId}`);
      }

    } catch (err) {
      console.error('Error initiating chat:', err);
      setError('Failed to initiate chat.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Find User
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Search by username"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <Button variant="contained" onClick={handleSearch} disabled={loading}>
          Search
        </Button>
      </Box>

      {loading && (
        <Box sx={{ textAlign: 'center' }}><CircularProgress /></Box>
      )}

      {error && (
        <Typography color="error" textAlign="center">{error}</Typography>
      )}

      {!loading && !error && searchResults.length > 0 && (
        <List component={Paper} elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {searchResults.map(user => (
            <ListItem button key={user.id} onClick={() => handleUserClick(user.id)} divider>
              <ListItemAvatar>
                <Avatar src={user.photoURL || ''} alt={user.displayName} />
              </ListItemAvatar>
              <ListItemText primary={user.displayName} secondary={user.email} />
            </ListItem>
          ))}
        </List>
      )}
      
      {!loading && !error && searchResults.length === 0 && searchTerm !== '' && (
          <Typography textAlign="center">No users found.</Typography>
      )}
    </Container>
  );
};

export default FindUserPage; 