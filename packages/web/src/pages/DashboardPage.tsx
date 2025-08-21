import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
} from '@mui/material'
import { School, DirectionsCar, Queue, QrCode } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const response = await api.get('/students')
      return response.data.data
    },
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const response = await api.get('/vehicles')
      return response.data.data
    },
  })

  const { data: queueEntries } = useQuery({
    queryKey: ['queue-entries'],
    queryFn: async () => {
      const response = await api.get('/queue/my-entries')
      return response.data.data
    },
  })

  const stats = [
    {
      title: 'Students',
      value: students?.length || 0,
      icon: <School />,
      color: '#1976d2',
      action: () => navigate('/students'),
    },
    {
      title: 'Vehicles',
      value: vehicles?.length || 0,
      icon: <DirectionsCar />,
      color: '#2e7d32',
      action: () => navigate('/vehicles'),
    },
    {
      title: 'In Queue',
      value: queueEntries?.length || 0,
      icon: <Queue />,
      color: '#ed6c02',
      action: () => navigate('/queue'),
    },
  ]

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Welcome back, {user?.name}!
      </Typography>

      {(!students || students.length === 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Get started by adding your students and vehicles to manage pickup queue efficiently.
        </Alert>
      )}

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
              onClick={stat.action}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: `${stat.color}20`,
                      color: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Students
            </Typography>
            {students && students.length > 0 ? (
              <List>
                {students.slice(0, 5).map((student: any) => (
                  <ListItem key={student.id} divider>
                    <ListItemText
                      primary={student.name}
                      secondary={`Grade ${student.grade} • ${student.school?.name || 'No school'}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No students added yet. Add your first student to get started.
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/students')}>
                Manage Students
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Queue Status
            </Typography>
            {queueEntries && queueEntries.length > 0 ? (
              <List>
                {queueEntries.map((entry: any) => (
                  <ListItem key={entry.id} divider>
                    <ListItemText
                      primary={entry.student.name}
                      secondary={entry.school.name}
                    />
                    <Chip
                      label={entry.status === 'waiting' ? 'Waiting' : 'Called'}
                      color={entry.status === 'waiting' ? 'warning' : 'success'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No students currently in queue.
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/queue')}>
                View Queue
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<School />}
                  onClick={() => navigate('/students')}
                >
                  Add Student
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<DirectionsCar />}
                  onClick={() => navigate('/vehicles')}
                >
                  Add Vehicle
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<QrCode />}
                  onClick={() => navigate('/vehicles')}
                >
                  Print QR Codes
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Queue />}
                  onClick={() => navigate('/queue')}
                >
                  Join Queue
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}