import { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Badge,
  alpha,
  useTheme,
  Fade,
  Grow,
  Zoom
} from '@mui/material'
import { People, Circle, PersonAdd } from '@mui/icons-material'
import useActiveUsers from '../hooks/useActiveUsers'

interface ActiveUsersDisplayProps {
  showAllUsers?: boolean // true for admin view, false for school view
  compact?: boolean // compact display for smaller screens
}

export default function ActiveUsersDisplay({ 
  showAllUsers = false, 
  compact = false 
}: ActiveUsersDisplayProps) {
  const { activeUsers, totalUsers } = useActiveUsers(showAllUsers)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const theme = useTheme()
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }
  
  const open = Boolean(anchorEl)

  if (totalUsers === 0) return null

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return theme.palette.error.main
      case 'teacher': return theme.palette.primary.main
      case 'parent': return theme.palette.success.main
      default: return theme.palette.grey[500]
    }
  }

  const getRoleGradient = (role?: string) => {
    switch (role) {
      case 'admin': return `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`
      case 'teacher': return `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
      case 'parent': return `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
      default: return `linear-gradient(135deg, ${theme.palette.grey[500]} 0%, ${theme.palette.grey[700]} 100%)`
    }
  }

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'teacher': return 'Teacher'  
      case 'parent': return 'Parent'
      default: return 'User'
    }
  }

  if (compact) {
    return (
      <Grow in timeout={500}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge 
            badgeContent={totalUsers} 
            color="success"
            sx={{
              '& .MuiBadge-badge': {
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                color: 'white',
                fontWeight: 700,
                fontSize: '0.75rem',
                minWidth: 20,
                height: 20,
                borderRadius: '10px',
                boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.3)}`,
                animation: 'pulse 2s infinite'
              }
            }}
          >
            <Chip
              icon={<People sx={{ fontSize: '1.125rem' }} />}
              label={`${totalUsers} online`}
              size="small"
              variant="outlined"
              onClick={handleClick}
              sx={{ 
                cursor: 'pointer',
                borderWidth: 2,
                borderColor: alpha(theme.palette.success.main, 0.3),
                color: theme.palette.success.main,
                fontWeight: 600,
                fontSize: '0.8125rem',
                background: alpha(theme.palette.success.main, 0.05),
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: theme.palette.success.main,
                  background: alpha(theme.palette.success.main, 0.1),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${alpha(theme.palette.success.main, 0.2)}`
                },
                '&:active': {
                  transform: 'translateY(0px)'
                }
              }}
            />
          </Badge>
        
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            TransitionComponent={Fade}
            transitionDuration={300}
            sx={{
              '& .MuiPopover-paper': {
                borderRadius: 4,
                boxShadow: `0 20px 40px ${alpha(theme.palette.grey[900], 0.15)}`,
                border: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
                backdropFilter: 'blur(20px)'
              }
            }}
          >
            <Paper sx={{ 
              width: 320, 
              maxHeight: 420, 
              overflow: 'auto',
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: 'none'
            }}>
              <Box sx={{ 
                p: 3, 
                background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
                borderBottom: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
                borderRadius: '16px 16px 0 0'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: theme.shadows[3]
                  }}>
                    <People sx={{ fontSize: '1.25rem' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700,
                      color: theme.palette.grey[900],
                      fontSize: '1.125rem'
                    }}>
                      {showAllUsers ? 'All Active Users' : 'School Active Users'}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.grey[600],
                      fontSize: '0.875rem'
                    }}>
                      {totalUsers} online now
                    </Typography>
                  </Box>
                  <Chip
                    label={totalUsers}
                    size="small"
                    sx={{
                      ml: 'auto',
                      background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                      color: 'white',
                      fontWeight: 700,
                      minWidth: 32,
                      height: 24
                    }}
                  />
                </Box>
              </Box>
              <List dense sx={{ px: 1, py: 1 }}>
                {activeUsers.map((user, index) => (
                  <Fade in timeout={300 + (index * 100)} key={user.id}>
                    <ListItem sx={{
                      borderRadius: 3,
                      mb: 0.5,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        background: alpha(getRoleColor(user.role), 0.05),
                        transform: 'translateX(4px)'
                      }
                    }}>
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <Zoom in timeout={500 + (index * 50)}>
                              <Circle sx={{ 
                                fontSize: 12, 
                                color: theme.palette.success.main,
                                background: 'white',
                                borderRadius: '50%',
                                p: '1px'
                              }} />
                            </Zoom>
                          }
                        >
                          <Avatar 
                            sx={{ 
                              background: getRoleGradient(user.role),
                              width: 36, 
                              height: 36,
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              boxShadow: `0 4px 12px ${alpha(getRoleColor(user.role), 0.3)}`,
                              border: `2px solid ${alpha(getRoleColor(user.role), 0.1)}`
                            }}
                          >
                            {getUserInitials(user.name)}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 600,
                              color: theme.palette.grey[900],
                              fontSize: '0.875rem'
                            }}>
                              {user.name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="caption" sx={{ 
                              color: theme.palette.grey[600],
                              fontSize: '0.75rem'
                            }}>
                              {user.email}
                            </Typography>
                            <Chip
                              label={getRoleLabel(user.role)}
                              size="small"
                              sx={{ 
                                height: 18,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                background: alpha(getRoleColor(user.role), 0.1),
                                color: getRoleColor(user.role),
                                border: `1px solid ${alpha(getRoleColor(user.role), 0.2)}`,
                                '& .MuiChip-label': {
                                  px: 1
                                }
                              }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  </Fade>
                ))}
              </List>
            </Paper>
          </Popover>
        </Box>
      </Grow>
    )
  }

  // Full display mode
  return (
    <Grow in timeout={600}>
      <Paper sx={{ 
        p: 3, 
        minWidth: 280,
        background: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
        borderRadius: 4,
        boxShadow: `0 8px 32px ${alpha(theme.palette.grey[900], 0.08)}`
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mb: 3,
          pb: 2,
          borderBottom: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`
        }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: theme.shadows[3]
          }}>
            <People sx={{ fontSize: '1.25rem' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 700,
              color: theme.palette.grey[900],
              fontSize: '1.125rem',
              mb: 0.5
            }}>
              {showAllUsers ? 'All Active Users' : 'School Active Users'}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.grey[600],
              fontSize: '0.875rem'
            }}>
              {totalUsers} online now
            </Typography>
          </Box>
          <Chip
            label={totalUsers}
            size="small"
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
              color: 'white',
              fontWeight: 700,
              minWidth: 36,
              height: 28,
              fontSize: '0.875rem'
            }}
          />
        </Box>
      
        <List dense sx={{ py: 0 }}>
          {activeUsers.slice(0, 10).map((user, index) => ( // Show max 10 users in full mode
            <Fade in timeout={400 + (index * 100)} key={user.id}>
              <ListItem sx={{ 
                px: 0, 
                py: 1.5,
                borderRadius: 3,
                mb: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  background: alpha(getRoleColor(user.role), 0.05),
                  transform: 'translateX(4px)'
                }
              }}>
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Zoom in timeout={600 + (index * 50)}>
                        <Circle sx={{ 
                          fontSize: 14, 
                          color: theme.palette.success.main,
                          background: 'white',
                          borderRadius: '50%',
                          p: '2px'
                        }} />
                      </Zoom>
                    }
                  >
                    <Avatar 
                      sx={{ 
                        background: getRoleGradient(user.role),
                        width: 40, 
                        height: 40,
                        fontSize: '1rem',
                        fontWeight: 700,
                        boxShadow: `0 4px 12px ${alpha(getRoleColor(user.role), 0.3)}`,
                        border: `2px solid ${alpha(getRoleColor(user.role), 0.1)}`
                      }}
                    >
                      {getUserInitials(user.name)}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 600,
                        color: theme.palette.grey[900],
                        fontSize: '0.9375rem'
                      }}>
                        {user.name}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.grey[600],
                        fontSize: '0.8125rem'
                      }}>
                        {user.email}
                      </Typography>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: alpha(getRoleColor(user.role), 0.1),
                          color: getRoleColor(user.role),
                          border: `1px solid ${alpha(getRoleColor(user.role), 0.2)}`,
                          '& .MuiChip-label': {
                            px: 1.5
                          }
                        }}
                      />
                    </Box>
                  }
                />
              </ListItem>
            </Fade>
          ))}
        
          {totalUsers > 10 && (
            <Fade in timeout={800}>
              <ListItem sx={{ 
                px: 0, 
                py: 1.5,
                justifyContent: 'center',
                borderRadius: 3,
                background: alpha(theme.palette.grey[100], 0.5),
                mt: 1
              }}>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.grey[600],
                      fontStyle: 'italic',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      fontWeight: 500
                    }}>
                      +{totalUsers - 10} more users online
                    </Typography>
                  }
                />
              </ListItem>
            </Fade>
          )}
        </List>
      </Paper>
    </Grow>
  )
}