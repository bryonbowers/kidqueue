import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Fade,
  alpha,
  useTheme,
  Container,
} from '@mui/material'
import { Add, Edit, Delete, QrCode } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { getStudentsByParent, createStudent, updateStudent, deleteStudent, generateQRData } from '../services/firebaseService'
import { subscriptionService } from '../services/subscriptionService'

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  grade: z.string().min(1, 'Grade is required'),
})

type StudentForm = z.infer<typeof studentSchema>

export default function StudentsPage() {
  const { user } = useAuth()
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedStudentQR, setSelectedStudentQR] = useState<any>(null)
  const [usageLimits, setUsageLimits] = useState<any>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      return await getStudentsByParent(user.id)
    },
    enabled: !!user?.id,
  })

  const { data: limits } = useQuery({
    queryKey: ['usage-limits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return await subscriptionService.checkUsageLimits(user.id)
    },
    enabled: !!user?.id,
    onSuccess: (data) => {
      setUsageLimits(data)
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: StudentForm) => {
      if (!user?.id || !user?.schoolId) throw new Error('User not authenticated')
      
      // Check usage limits before creating
      const limits = await subscriptionService.checkUsageLimits(user.id)
      if (!limits.canCreateStudent) {
        const message = limits.studentsLimit 
          ? `You've reached your student limit of ${limits.studentsLimit}. Please upgrade your plan to add more students.`
          : 'You need an active subscription to add students.'
        throw new Error(message)
      }
      
      const qrCode = generateQRData('student', 'temp')
      const studentData = {
        ...data,
        parentId: user.id,
        schoolId: user.schoolId,
        qrCode
      }
      const id = await createStudent(studentData)
      return { id, ...studentData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['usage-limits'] })
      setOpen(false)
      reset()
      setLimitError(null)
    },
    onError: (error: any) => {
      setLimitError(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentForm> }) => {
      await updateStudent(id, data)
      return { id, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setOpen(false)
      setEditingStudent(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteStudent(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  const qrMutation = useMutation({
    mutationFn: async (student: any) => {
      // Generate QR data for the student
      return {
        qrCode: student.qrCode,
        data: `KIDQUEUE_STUDENT_${student.id}_${Date.now()}`
      }
    },
    onSuccess: (data) => {
      setSelectedStudentQR(data)
      setQrDialogOpen(true)
    },
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      grade: '',
    },
  })

  const handleOpen = (student?: any) => {
    if (student) {
      setEditingStudent(student)
      reset({
        name: student.name,
        grade: student.grade,
      })
    } else {
      setEditingStudent(null)
      reset()
    }
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingStudent(null)
    reset()
  }

  const onSubmit = (data: StudentForm) => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleShowQR = (studentId: string) => {
    qrMutation.mutate(studentId)
  }

  const grades = [
    'Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', 
    '6th', '7th', '8th', '9th', '10th', '11th', '12th'
  ]

  return (
    <Container maxWidth="xl">
      <Fade in timeout={800}>
        <Box>
          {/* Hero Header */}
          <Box 
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              borderRadius: 3,
              p: 4,
              mb: 4,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1
                  }}
                >
                  Student Management
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  Manage your children's school information and pickup codes
                </Typography>
                {limits && (
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: theme.palette.text.secondary,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    Usage: <Chip 
                      label={`${limits.studentsUsed} of ${limits.studentsLimit || '∞'} students`}
                      size="small"
                      color={limits.canCreateStudent ? 'success' : 'warning'}
                      sx={{ fontWeight: 600 }}
                    />
                  </Typography>
                )}
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                onClick={() => handleOpen()}
                disabled={!!(limits && !limits.canCreateStudent)}
                sx={{
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 48px rgba(37, 99, 235, 0.4)',
                  },
                  '&:disabled': {
                    background: alpha(theme.palette.action.disabled, 0.2),
                    color: theme.palette.action.disabled,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Add Student
              </Button>
            </Box>
          </Box>

          {/* Alerts */}
          {limitError && (
            <Fade in timeout={400}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2, 
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)}, ${alpha(theme.palette.error.light, 0.05)})`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                }} 
                onClose={() => setLimitError(null)}
              >
                {limitError}
              </Alert>
            </Fade>
          )}

          {limits && !limits.canCreateStudent && (
            <Fade in timeout={400}>
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)}, ${alpha(theme.palette.warning.light, 0.05)})`,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                }}
              >
                {limits.studentsLimit 
                  ? `You've reached your student limit of ${limits.studentsLimit}. Upgrade your plan to add more students.`
                  : 'You need an active subscription to add students.'
                }
              </Alert>
            </Fade>
          )}

          {!students || students.length === 0 ? (
            <Fade in timeout={600}>
              <Box 
                sx={{
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.info.light, 0.05)})`,
                  border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  borderRadius: 3,
                  p: 4,
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Typography variant="h5" color="info.main" sx={{ mb: 2, fontWeight: 600 }}>
                  Ready to Get Started?
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Add your first student to get started with pickup queue management.
                </Typography>
                <Button 
                  variant="contained" 
                  size="large" 
                  startIcon={<Add />} 
                  onClick={() => handleOpen()}
                  disabled={!!(limits && !limits.canCreateStudent)}
                  sx={{
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 32px rgba(33, 150, 243, 0.3)',
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  Add Your First Student
                </Button>
              </Box>
            </Fade>
          ) : (
            <Grid container spacing={3}>
              {students.map((student: any, index: number) => (
                <Grid item xs={12} sm={6} lg={4} key={student.id}>
                  <Fade in timeout={800 + index * 100}>
                    <Card
                      sx={{
                        height: '100%',
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        borderRadius: 3,
                        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        },
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        {/* Student Name Header */}
                        <Box sx={{ mb: 2 }}>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 700,
                              color: theme.palette.primary.main,
                              mb: 0.5,
                              textAlign: 'center'
                            }}
                          >
                            {student.name}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <Chip 
                              label="Active" 
                              color="success" 
                              sx={{ 
                                borderRadius: 1.5,
                                fontWeight: 600,
                                background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                              }} 
                            />
                          </Box>
                        </Box>

                        {/* Student Details */}
                        <Box sx={{ mb: 2, textAlign: 'center' }}>
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              color: theme.palette.secondary.main,
                              fontWeight: 600,
                              mb: 2
                            }}
                          >
                            Grade {student.grade}
                          </Typography>
                          
                          <Typography 
                            variant="body1" 
                            color="text.secondary" 
                            sx={{ 
                              fontWeight: 500,
                              padding: 2,
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.5)}, ${alpha(theme.palette.background.paper, 0.8)})`,
                              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}
                          >
                            🏫 {student.school?.name || 'No school assigned'}
                          </Typography>
                        </Box>
                      </CardContent>

                      <CardActions sx={{ 
                        p: 3, 
                        pt: 0, 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                      }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            onClick={() => handleShowQR(student.id)}
                            sx={{
                              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                              color: theme.palette.primary.main,
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.1)})`,
                                transform: 'scale(1.1)',
                              }
                            }}
                            title="Show QR Code"
                          >
                            <QrCode />
                          </IconButton>
                          <IconButton
                            onClick={() => handleOpen(student)}
                            sx={{
                              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.info.light, 0.05)})`,
                              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                              color: theme.palette.info.main,
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.2)}, ${alpha(theme.palette.info.light, 0.1)})`,
                                transform: 'scale(1.1)',
                              }
                            }}
                            title="Edit Student"
                          >
                            <Edit />
                          </IconButton>
                        </Box>
                        <IconButton
                          onClick={() => handleDelete(student.id)}
                          sx={{
                            background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)}, ${alpha(theme.palette.error.light, 0.05)})`,
                            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                            color: theme.palette.error.main,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.2)}, ${alpha(theme.palette.error.light, 0.1)})`,
                              transform: 'scale(1.1)',
                            }
                          }}
                          title="Delete Student"
                        >
                          <Delete />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Fade>
                </Grid>
              ))}
            </Grid>
          )}

      {/* Add/Edit Student Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStudent ? 'Edit Student' : 'Add New Student'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Student Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
              <Controller
                name="grade"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Grade"
                    fullWidth
                    error={!!errors.grade}
                    helperText={errors.grade?.message}
                  >
                    {grades.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        {grade}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingStudent ? 'Update' : 'Add'} Student
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Student QR Code</DialogTitle>
        <DialogContent>
          {selectedStudentQR && (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <Typography variant="h6">{selectedStudentQR.studentName}</Typography>
              <Box
                component="img"
                src={selectedStudentQR.qrCode}
                alt="QR Code"
                sx={{ maxWidth: 300, width: '100%' }}
              />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Teachers can scan this QR code to add {selectedStudentQR.studentName} to the pickup queue.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Fade>
    </Container>
  )
}