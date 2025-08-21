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
} from '@mui/material'
import { Add, Edit, Delete, QrCode, Print } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../utils/api'

const vehicleSchema = z.object({
  licensePlate: z.string().min(1, 'License plate is required'),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
})

type VehicleForm = z.infer<typeof vehicleSchema>

export default function VehiclesPage() {
  const [open, setOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedVehicleQR, setSelectedVehicleQR] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const response = await api.get('/vehicles')
      return response.data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: VehicleForm) => {
      const response = await api.post('/vehicles', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleForm> }) => {
      const response = await api.patch(`/vehicles/${id}`, data)
      return response.data
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
      const response = await api.delete(`/vehicles/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
  })

  const qrMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const response = await api.get(`/qr/vehicle/${vehicleId}`)
      return response.data
    },
    onSuccess: (data) => {
      setSelectedVehicleQR(data.data)
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
      })
    } else {
      setEditingVehicle(null)
      reset()
    }
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
    qrMutation.mutate(vehicleId)
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Add Vehicle
        </Button>
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
          {selectedVehicleQR && (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <Typography variant="h6">{selectedVehicleQR.vehicleInfo}</Typography>
              <Card sx={{ maxWidth: 350, textAlign: 'center' }}>
                <CardContent>
                  <Box
                    component="img"
                    src={selectedVehicleQR.qrCode}
                    alt="QR Code"
                    sx={{ maxWidth: 250, width: '100%' }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Place this QR code sticker on your windshield. Teachers can scan it to add all your students to the pickup queue.
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}