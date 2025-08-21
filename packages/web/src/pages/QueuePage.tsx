import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import api from '../utils/api'

export default function QueuePage() {
  const { data: queueEntries, isLoading, refetch } = useQuery({
    queryKey: ['queue-entries'],
    queryFn: async () => {
      const response = await api.get('/queue/my-entries')
      return response.data.data
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Queue Status</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </Box>

      {!queueEntries || queueEntries.length === 0 ? (
        <Alert severity="info">
          No students currently in pickup queue. Use the mobile app or have a teacher scan your QR code to join the queue.
        </Alert>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Students in Queue
          </Typography>
          <List>
            {queueEntries.map((entry: any, index: number) => (
              <ListItem key={entry.id} divider={index < queueEntries.length - 1}>
                <ListItemText
                  primary={entry.student.name}
                  secondary={`${entry.school.name} • Position ${entry.queuePosition} • Entered at ${new Date(entry.enteredAt).toLocaleTimeString()}`}
                />
                <Chip
                  label={entry.status === 'waiting' ? 'Waiting' : 'Called for Pickup'}
                  color={entry.status === 'waiting' ? 'warning' : 'success'}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )
}