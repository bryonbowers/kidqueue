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
  Chip,
  Alert,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material'
import { Add, Edit, Delete, QrCode, Print } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import QRCodeGenerator from 'qrcode'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { getVehiclesByParent, createVehicle, updateVehicle, deleteVehicle, generateVehicleQRData, getStudentsByParent, getVehicleByLicensePlate, migrateVehicleQRCodes } from '../services/firebaseService'

const vehicleSchema = z.object({
  licensePlate: z.string().min(1, 'License plate is required')
    .transform(val => val.toUpperCase().trim())
    .refine(val => val.length >= 2, 'License plate must be at least 2 characters')
    .refine(val => /^[A-Z0-9\-\s]+$/.test(val), 'License plate can only contain letters, numbers, hyphens, and spaces'),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  studentIds: z.array(z.string()).optional(),
})

type VehicleForm = z.infer<typeof vehicleSchema>

export default function VehiclesPage() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedVehicleQR, setSelectedVehicleQR] = useState<any>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      return await getVehiclesByParent(user.id)
    },
    enabled: !!user?.id,
  })

  const { data: students } = useQuery({
    queryKey: ['students', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      return await getStudentsByParent(user.id)
    },
    enabled: !!user?.id,
  })

  const createMutation = useMutation({
    mutationFn: async (data: VehicleForm) => {
      if (!user?.id) throw new Error('User not authenticated')
      
      // Generate QR code based on license plate
      const qrCode = generateVehicleQRData(data.licensePlate)
      
      const vehicleData = {
        ...data,
        parentId: user.id,
        qrCode
      }
      
      // This will throw an error if license plate already exists
      const id = await createVehicle(vehicleData)
      return { id, ...vehicleData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setCreateError(null)
      setOpen(false)
      reset()
    },
    onError: (error: Error) => {
      // Show the error message (e.g., "License plate ABC123 is already registered")
      setCreateError(error.message)
      console.error('Vehicle creation error:', error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleForm> }) => {
      await updateVehicle(id, data)
      return { id, ...data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setOpen(false)
      setEditingVehicle(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteVehicle(id)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })

  const migrateMutation = useMutation({
    mutationFn: migrateVehicleQRCodes,
    onSuccess: (count) => {
      alert(`Migration completed! Updated ${count} vehicles to new QR code format.`)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: (error: Error) => {
      alert(`Migration failed: ${error.message}`)
    }
  })

  const qrMutation = useMutation({
    mutationFn: async (vehicle: any) => {
      // Generate QR data based on license plate
      const qrData = generateVehicleQRData(vehicle.licensePlate)
      const qrCodeDataUrl = await QRCodeGenerator.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      return {
        qrCode: qrCodeDataUrl,
        data: qrData,
        vehicleInfo: `${vehicle.make || ''} ${vehicle.model || ''} - ${vehicle.licensePlate}`.trim(),
        licensePlate: vehicle.licensePlate
      }
    },
    onSuccess: (data) => {
      setSelectedVehicleQR(data)
      setQrDialogOpen(true)
    },
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      licensePlate: '',
      make: '',
      model: '',
      color: '',
    },
  })

  const handleOpen = (vehicle?: any) => {
    if (vehicle) {
      setEditingVehicle(vehicle)
      reset({
        licensePlate: vehicle.licensePlate,
        make: vehicle.make || '',
        model: vehicle.model || '',
        color: vehicle.color || '',
        studentIds: vehicle.studentIds || [],
      })
    } else {
      setEditingVehicle(null)
      reset()
    }
    setCreateError(null) // Clear any previous errors
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingVehicle(null)
    reset()
  }

  const onSubmit = (data: VehicleForm) => {
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleShowQR = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId)
    if (vehicle) {
      qrMutation.mutate(vehicle)
    }
  }

  const handlePrintQR = () => {
    if (selectedVehicleQR) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Vehicle QR Code - ${selectedVehicleQR.vehicleInfo}</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                .qr-container { display: inline-block; border: 2px solid #000; padding: 20px; margin: 20px; }
                .vehicle-info { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .instructions { font-size: 12px; margin-top: 10px; color: #666; }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <div class="vehicle-info">${selectedVehicleQR.vehicleInfo}</div>
                <img src="${selectedVehicleQR.qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
                <div class="instructions">
                  Place this sticker on your windshield<br/>
                  Teachers will scan to add students to pickup queue
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Vehicles</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => migrateMutation.mutate()}
            disabled={migrateMutation.isPending}
          >
            {migrateMutation.isPending ? 'Migrating...' : 'Fix QR Codes'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
          >
            Add Vehicle
          </Button>
        </Box>
      </Box>

      {!vehicles || vehicles.length === 0 ? (
        <Alert severity="info">
          No vehicles added yet. Add your vehicle to generate QR codes for easy pickup queue management.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>License Plate</TableCell>
                <TableCell>Make</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Associated Students</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.map((vehicle: any) => (
                <TableRow key={vehicle.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{vehicle.licensePlate}</TableCell>
                  <TableCell>{vehicle.make || '-'}</TableCell>
                  <TableCell>{vehicle.model || '-'}</TableCell>
                  <TableCell>{vehicle.color || '-'}</TableCell>
                  <TableCell>
                    {vehicle.studentIds && vehicle.studentIds.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {vehicle.studentIds.map((studentId: string) => {
                          const student = students?.find(s => s?.id === studentId)
                          return (
                            <Chip 
                              key={studentId} 
                              label={student?.name || `Student ${studentId.slice(0, 8)}`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )
                        })}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No students associated
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label="Active" color="success" size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleShowQR(vehicle.id)}
                      color="primary"
                      title="Show QR Code"
                    >
                      <QrCode />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpen(vehicle)}
                      color="primary"
                      title="Edit"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(vehicle.id)}
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

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {createError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {createError}
              </Alert>
            )}
            <Box display="flex" flexDirection="column" gap={2}>
              <Controller
                name="licensePlate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="License Plate"
                    fullWidth
                    error={!!errors.licensePlate}
                    helperText={errors.licensePlate?.message}
                    placeholder="ABC-1234"
                  />
                )}
              />
              <Controller
                name="make"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Make (Optional)"
                    fullWidth
                    placeholder="Toyota, Honda, Ford, etc."
                  />
                )}
              />
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Model (Optional)"
                    fullWidth
                    placeholder="Camry, Accord, F-150, etc."
                  />
                )}
              />
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Color (Optional)"
                    fullWidth
                    placeholder="Red, Blue, White, etc."
                  />
                )}
              />
              
              <Controller
                name="studentIds"
                control={control}
                defaultValue={[]}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Associated Students</InputLabel>
                    <Select
                      {...field}
                      multiple
                      input={<OutlinedInput label="Associated Students" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((studentId) => {
                            const student = students?.find(s => s?.id === studentId)
                            return (
                              <Chip key={studentId} label={student?.name || `Student ${studentId.slice(0, 8)}`} size="small" />
                            )
                          })}
                        </Box>
                      )}
                    >
                      {students?.map((student) => (
                        <MenuItem key={student?.id} value={student?.id}>
                          <Checkbox checked={(field.value || []).indexOf(student?.id) > -1} />
                          <ListItemText 
                            primary={student?.name || 'Unknown Student'} 
                            secondary={`Grade ${student?.grade || 'Unknown'}`} 
                          />
                        </MenuItem>
                      ))}
                      {(!students || students.length === 0) && (
                        <MenuItem disabled>
                          <ListItemText primary="No students added yet" />
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
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
              {editingVehicle ? 'Update' : 'Add'} Vehicle
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vehicle QR Code</DialogTitle>
        <DialogContent>
          {qrMutation.isPending ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2} sx={{ py: 4 }}>
              <Typography>Generating QR Code...</Typography>
            </Box>
          ) : selectedVehicleQR ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <Box textAlign="center">
                <Typography variant="h6">{selectedVehicleQR.vehicleInfo}</Typography>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mt: 1 }}>
                  {selectedVehicleQR.licensePlate}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  License Plate
                </Typography>
              </Box>
              <Card sx={{ maxWidth: 350, textAlign: 'center' }}>
                <CardContent>
                  <Box
                    component="img"
                    src={selectedVehicleQR.qrCode}
                    alt="QR Code"
                    sx={{ maxWidth: 250, width: '100%' }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    This QR code is linked to license plate <strong>{selectedVehicleQR.licensePlate}</strong>. 
                    Place it on your windshield for easy pickup queue management.
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1, fontFamily: 'monospace' }}>
                    QR Data: {selectedVehicleQR.data}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<Print />}
                    onClick={handlePrintQR}
                  >
                    Print Sticker
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2} sx={{ py: 4 }}>
              <Typography>No QR code data available</Typography>
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