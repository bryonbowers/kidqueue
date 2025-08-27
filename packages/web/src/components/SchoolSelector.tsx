import React, { useState } from 'react'
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material'
import {
  School as SchoolIcon,
  ExpandMore,
  Add,
  AdminPanelSettings,
  Person,
  Groups,
} from '@mui/icons-material'
import { useSchool } from '../contexts/SchoolContext'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import { createSchool } from '../services/schoolService'
import { subscriptionService } from '../services/subscriptionService'

interface SchoolSelectorProps {
  variant?: 'button' | 'chip' | 'minimal'
  showRole?: boolean
}

export const SchoolSelector: React.FC<SchoolSelectorProps> = ({ 
  variant = 'button',
  showRole = true 
}) => {
  const { user } = useAuth()
  const { trackFeatureUsed, trackConversion } = useAnalytics()
  const {
    currentSchool,
    availableSchools,
    allActiveSchools,
    isLoadingSchools,
    switchSchool,
    refreshSchools,
    userRoleAtCurrentSchool
  } = useSchool()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newSchoolAddress, setNewSchoolAddress] = useState('')
  const [isCreatingSchool, setIsCreatingSchool] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    trackFeatureUsed('school_selector_opened')
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSchoolSelect = async (schoolId: string) => {
    try {
      await switchSchool(schoolId)
      handleClose()
    } catch (error: any) {
      console.error('Error switching school:', error)
    }
  }

  const handleCreateSchool = async () => {
    if (!user || !newSchoolName.trim()) return

    setIsCreatingSchool(true)
    setCreateError(null)

    try {
      // Check usage limits before creating
      const limits = await subscriptionService.checkUsageLimits(user.id)
      if (!limits.canCreateSchool) {
        const message = limits.schoolsLimit 
          ? `You've reached your school limit of ${limits.schoolsLimit}. Please upgrade your plan to add more schools.`
          : 'You need an active subscription to create schools.'
        throw new Error(message)
      }
      const schoolId = await createSchool({
        name: newSchoolName.trim(),
        address: newSchoolAddress.trim(),
        adminIds: [user.id],
        teacherIds: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        active: true,
        createdBy: user.id,
        settings: {
          allowParentQRManagement: true,
          requireVehicleAssociation: true,
          maxStudentsPerVehicle: 5,
          queueAutoReset: false,
          notificationsEnabled: true
        }
      })

      // Track school creation conversion
      trackConversion('school_created', 1, {
        school_name: newSchoolName.substring(0, 20),
        created_by_role: user.role
      })

      // Refresh schools and switch to new one
      await refreshSchools()
      await switchSchool(schoolId)

      // Reset form and close dialog
      setNewSchoolName('')
      setNewSchoolAddress('')
      setCreateDialogOpen(false)
      handleClose()
    } catch (error: any) {
      console.error('Error creating school:', error)
      setCreateError(error.message || 'Failed to create school')
    } finally {
      setIsCreatingSchool(false)
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'admin': return <AdminPanelSettings fontSize="small" />
      case 'teacher': return <Person fontSize="small" />
      case 'parent': return <Groups fontSize="small" />
      default: return <Person fontSize="small" />
    }
  }

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin': return 'error'
      case 'teacher': return 'primary'
      case 'parent': return 'success'
      default: return 'default'
    }
  }

  if (isLoadingSchools) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading schools...
        </Typography>
      </Box>
    )
  }

  if (!currentSchool) {
    return (
      <Button
        variant="outlined"
        startIcon={<SchoolIcon />}
        onClick={() => setCreateDialogOpen(true)}
        color="primary"
      >
        Create School
      </Button>
    )
  }

  // Render based on variant
  if (variant === 'chip') {
    return (
      <>
        <Chip
          label={currentSchool.name}
          icon={<SchoolIcon />}
          onClick={handleClick}
          clickable
          color="primary"
          variant="outlined"
        />
        {renderMenu()}
      </>
    )
  }

  if (variant === 'minimal') {
    return (
      <>
        <Box 
          onClick={handleClick}
          sx={{ 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '&:hover': { opacity: 0.8 }
          }}
        >
          <SchoolIcon fontSize="small" />
          <Typography variant="body2">
            {currentSchool.name}
          </Typography>
          <ExpandMore fontSize="small" />
        </Box>
        {renderMenu()}
      </>
    )
  }

  // Default button variant
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<SchoolIcon />}
        endIcon={<ExpandMore />}
        onClick={handleClick}
        sx={{ justifyContent: 'space-between', minWidth: 200 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {currentSchool.name}
          </Typography>
          {showRole && userRoleAtCurrentSchool && (
            <Typography variant="caption" color="text.secondary">
              {userRoleAtCurrentSchool}
            </Typography>
          )}
        </Box>
      </Button>
      {renderMenu()}
    </>
  )

  function renderMenu() {
    return (
      <>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: { minWidth: 250, maxWidth: 350 }
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Your Schools
            </Typography>
          </Box>
          
          {availableSchools.map((school) => {
            const isAdmin = (school.adminIds || []).includes(user?.id || '')
            const isTeacher = (school.teacherIds || []).includes(user?.id || '')
            const role = isAdmin ? 'admin' : isTeacher ? 'teacher' : 'parent'
            
            return (
              <MenuItem
                key={school.id}
                onClick={() => handleSchoolSelect(school.id)}
                selected={school.id === currentSchool?.id}
              >
                <ListItemIcon>
                  {getRoleIcon(role)}
                </ListItemIcon>
                <ListItemText
                  primary={school.name}
                  secondary={school.address || 'No address set'}
                />
                <Chip
                  label={role}
                  size="small"
                  color={getRoleColor(role) as any}
                  variant="outlined"
                />
              </MenuItem>
            )
          })}

          {allActiveSchools.length > availableSchools.length && (
            <>
              <Divider />
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Other Schools
                </Typography>
              </Box>
              {allActiveSchools
                .filter(school => !availableSchools.find(as => as.id === school.id))
                .slice(0, 5) // Limit to prevent long lists
                .map((school) => (
                  <MenuItem
                    key={school.id}
                    onClick={() => handleSchoolSelect(school.id)}
                    sx={{ opacity: 0.7 }}
                  >
                    <ListItemIcon>
                      <SchoolIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={school.name}
                      secondary="Public school"
                    />
                  </MenuItem>
                ))}
            </>
          )}

          <Divider />
          <MenuItem onClick={() => setCreateDialogOpen(true)}>
            <ListItemIcon>
              <Add />
            </ListItemIcon>
            <ListItemText primary="Create New School" />
          </MenuItem>
        </Menu>

        {/* Create School Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New School</DialogTitle>
          <DialogContent>
            {createError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createError}
              </Alert>
            )}
            
            <TextField
              autoFocus
              margin="dense"
              label="School Name"
              fullWidth
              variant="outlined"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
              placeholder="e.g., Sunset Elementary School"
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="School Address"
              fullWidth
              variant="outlined"
              value={newSchoolAddress}
              onChange={(e) => setNewSchoolAddress(e.target.value)}
              placeholder="e.g., 123 Main St, Anytown, ST 12345"
              multiline
              rows={2}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You will be set as the administrator of this school and can invite teachers later.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreatingSchool}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchool}
              variant="contained"
              disabled={!newSchoolName.trim() || isCreatingSchool}
            >
              {isCreatingSchool ? <CircularProgress size={20} /> : 'Create School'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    )
  }
}

export default SchoolSelector