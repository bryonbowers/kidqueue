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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Students</Typography>
          {limits && (
            <Typography variant="body2" color="text.secondary">
              {limits.studentsUsed} of {limits.studentsLimit || '∞'} students used
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          disabled={!!(limits && !limits.canCreateStudent)}
        >
          Add Student
        </Button>
      </Box>

      {limitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLimitError(null)}>
          {limitError}
        </Alert>
      )}

      {limits && !limits.canCreateStudent && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {limits.studentsLimit 
            ? `You've reached your student limit of ${limits.studentsLimit}. Upgrade your plan to add more students.`
            : 'You need an active subscription to add students.'
          }
        </Alert>
      )}

      {!students || students.length === 0 ? (
        <Alert severity="info">
          No students added yet. Add your first student to get started with pickup queue management.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>School</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.school?.name || 'No school assigned'}</TableCell>
                  <TableCell>
                    <Chip label="Active" color="success" size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleShowQR(student.id)}
                      color="primary"
                      title="Show QR Code"
                    >
                      <QrCode />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpen(student)}
                      color="primary"
                      title="Edit"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(student.id)}
                      color="error"
                      title="Delete"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
  )
}