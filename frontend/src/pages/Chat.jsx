import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  height: 'calc(100vh - 100px)',
  display: 'flex',
  flexDirection: 'column',
}));

const MessageList = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
}));

const MessageInput = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'John Doe',
      avatar: 'https://via.placeholder.com/40',
      content: 'Hey, did you see the traffic on Main Street?',
      timestamp: '10:30 AM',
      isGroup: true,
      groupName: '#traffic-alerts',
    },
    {
      id: 2,
      sender: 'Jane Smith',
      avatar: 'https://via.placeholder.com/40',
      content: "Yes, it's pretty bad. I suggest taking the alternate route.",
      timestamp: '10:32 AM',
      isGroup: true,
      groupName: '#traffic-alerts',
    },
    {
      id: 3,
      sender: 'Mike Johnson',
      avatar: 'https://via.placeholder.com/40',
      content: 'Thanks for the heads up!',
      timestamp: '10:35 AM',
      isGroup: true,
      groupName: '#traffic-alerts',
    },
  ]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: 'You',
        avatar: 'https://via.placeholder.com/40',
        content: message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isGroup: true,
        groupName: '#traffic-alerts',
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4, height: '100vh' }}>
      <Typography variant="h4" gutterBottom>
        Local Chat
      </Typography>

      <StyledPaper elevation={3}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Chip
            label="#traffic-alerts"
            color="primary"
            variant="outlined"
          />
        </Box>

        <MessageList>
          <List>
            {messages.map((msg) => (
              <ListItem
                key={msg.id}
                alignItems="flex-start"
                sx={{
                  flexDirection: msg.sender === 'You' ? 'row-reverse' : 'row',
                }}
              >
                <ListItemAvatar>
                  <Avatar src={msg.avatar} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: msg.sender === 'You' ? 'flex-end' : 'flex-start',
                        gap: 1,
                      }}
                    >
                      <Typography
                        component="span"
                        variant="subtitle2"
                        color="text.primary"
                      >
                        {msg.sender}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        {msg.timestamp}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1,
                        mt: 0.5,
                        maxWidth: '70%',
                        backgroundColor: msg.sender === 'You' ? 'primary.light' : 'grey.100',
                        color: msg.sender === 'You' ? 'white' : 'text.primary',
                        display: 'inline-block',
                      }}
                    >
                      {msg.content}
                    </Paper>
                  }
                />
              </ListItem>
            ))}
          </List>
        </MessageList>

        <MessageInput>
          <form onSubmit={handleSendMessage}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                size="small"
              />
              <IconButton
                color="primary"
                type="submit"
                disabled={!message.trim()}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </form>
        </MessageInput>
      </StyledPaper>
    </Container>
  );
};

export default Chat; 