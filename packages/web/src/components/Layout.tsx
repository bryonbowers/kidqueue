import { useState, ReactNode } from 'react'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  alpha,
  useTheme,
  Chip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  School,
  DirectionsCar,
  Queue,
  School as TeachingIcon,
  AccountCircle,
  Logout,
  Subscriptions,
  Security,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import SubscriptionService from '../services/subscriptionService'
import SchoolSelector from './SchoolSelector'

const drawerWidth = 240

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { user, logout } = useAuth()
  const { trackLogout, trackNavigation, trackFeatureUsed } = useAnalytics()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    trackLogout()
    logout()
    handleProfileMenuClose()
  }

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Students', icon: <School />, path: '/students' },
    { text: 'Vehicles', icon: <DirectionsCar />, path: '/vehicles' },
    { text: 'My Account', icon: <AccountCircle />, path: '/my-account' },
  ]

  // Add subscription link for all users (deprecated - replaced by My Account)
  // menuItems.push({ text: 'Subscription', icon: <Subscriptions />, path: '/subscription' })

  if (user?.role === 'teacher' || user?.role === 'admin') {
    menuItems.push({ text: 'Teacher Dashboard', icon: <TeachingIcon />, path: '/teacher' })
  }

  // Add admin-only subscription management
  if (user && SubscriptionService.isAdmin(user.email)) {
    menuItems.push({ text: 'Manage Subscriptions', icon: <Security />, path: '/admin/subscriptions' })
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand Section */}
      <Box sx={{ 
        p: 3, 
        background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: theme.shadows[3]
          }}>
            🚗
          </Box>
          <Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: theme.palette.grey[900],
              fontSize: '1.125rem'
            }}>
              KidQueue
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.grey[600],
              fontSize: '0.75rem',
              mt: -0.5
            }}>
              Smart Pickup System
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation Section */}
      <Box sx={{ flex: 1, px: 2, py: 3 }}>
        <List sx={{ gap: 0.5 }}>
          {menuItems.map((item) => {
            const isSelected = location.pathname === item.path
            return (
              <ListItem key={item.text} sx={{ px: 0, mb: 0.5 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => {
                    trackNavigation(location.pathname, item.path, 'click')
                    navigate(item.path)
                  }}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&.Mui-selected': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.light}15 100%)`,
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      transform: 'translateX(4px)',
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.primary.light}20 100%)`,
                      }
                    },
                    '&:hover': {
                      background: alpha(theme.palette.grey[100], 0.8),
                      transform: 'translateX(2px)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 44,
                    color: isSelected ? theme.palette.primary.main : theme.palette.grey[600],
                    '& svg': {
                      fontSize: '1.25rem'
                    }
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{
                      '& .MuiTypography-root': {
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? theme.palette.primary.main : theme.palette.grey[700]
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>

      {/* User Info Section */}
      <Box sx={{ 
        p: 2.5,
        borderTop: `1px solid ${theme.palette.grey[200]}`,
        background: alpha(theme.palette.grey[50], 0.5)
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ 
            width: 36, 
            height: 36,
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ 
              fontWeight: 600,
              color: theme.palette.grey[900],
              fontSize: '0.8125rem',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user?.name || 'User'}
            </Typography>
            {user?.role && (
              <Chip
                label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  mt: 0.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
          color: theme.palette.text.primary
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              color: theme.palette.grey[600]
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h5" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              color: theme.palette.grey[900],
              fontSize: { xs: '1.125rem', sm: '1.25rem' }
            }}
          >
            School Pickup Queue
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <SchoolSelector variant="minimal" showRole={false} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ 
                  color: theme.palette.grey[600],
                  fontSize: '0.875rem'
                }}>
                  {user?.name}
                </Typography>
              </Box>
              
              <IconButton
                size="medium"
                aria-label="account of current user"
                aria-controls="profile-menu"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                sx={{ 
                  p: 0.5,
                  '&:hover': {
                    transform: 'scale(1.05)',
                    transition: 'transform 0.2s ease-in-out'
                  }
                }}
              >
                <Avatar sx={{ 
                  width: 36, 
                  height: 36,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: theme.shadows[2]
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={() => {
          navigate('/my-account')
          handleProfileMenuClose()
        }}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          My Account
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation menu"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              position: 'relative',
              whiteSpace: 'nowrap',
              border: 'none',
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              boxShadow: `20px 0 40px ${alpha(theme.palette.grey[500], 0.1)}`
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }} />
        <Box sx={{ mt: { xs: 1, sm: 2 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}