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
import api from '../utils/api'

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  grade: z.string().min(1, 'Grade is required'),
  schoolId: z.string().min(1, 'School is required'),
})

type StudentForm = z.infer<typeof studentSchema>

export default function StudentsPage() {
  const [open, setOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedStudentQR, setSelectedStudentQR] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const response = await api.get('/students')
      return response.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: StudentForm) => {
      const response = await api.post('/students', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentForm> }) => {
      const response = await api.patch(`/students/${id}`, data)
      return response.data
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
      const response = await api.delete(`/students/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  const qrMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const response = await api.get(`/qr/student/${studentId}`)
      return response.data
    },
    onSuccess: (data) => {
      setSelectedStudentQR(data.data)
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
      schoolId: '',
    },
  })

  const handleOpen = (student?: any) => {
    if (student) {
      setEditingStudent(student)
      reset({
        name: student.name,
        grade: student.grade,
        schoolId: student.schoolId,
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
        <Typography variant="h4">Students</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Add Student
        </Button>
      </Box>

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
              <Controller
                name="schoolId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="School ID"
                    fullWidth
                    error={!!errors.schoolId}
                    helperText={errors.schoolId?.message || "Contact your school for the school ID"}
                  />
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