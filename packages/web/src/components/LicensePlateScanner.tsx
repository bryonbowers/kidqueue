import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  Box, 
  Button, 
  Typography, 
  Alert, 
  IconButton, 
  TextField, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Divider
} from '@mui/material'
import { 
  Close, 
  CameraAlt, 
  Keyboard, 
  FlashOn, 
  FlashOff, 
  Cameraswitch,
  DirectionsCar,
  Person,
  Add as AddIcon
} from '@mui/icons-material'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useSchool } from '../contexts/SchoolContext'
import useSchoolFirebase from '../hooks/useSchoolFirebase'
import { useAnalytics } from '../hooks/useAnalytics'

interface LicensePlateScannerProps {
  onComplete: (result: { vehicleId: string; studentIds: string[] }) => void
  onClose: () => void
  isOpen: boolean
}

interface Student {
  id: string
  name: string
  grade: string
  parentId: string
  schoolId: string
}

interface Vehicle {
  id: string
  licensePlate: string
  make?: string
  model?: string
  color?: string
  parentId: string
  studentIds?: string[]
  qrCode: string
}

export default function LicensePlateScanner({ onComplete, onClose, isOpen }: LicensePlateScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { user } = useAuth()
  const { currentSchool } = useSchool()
  const schoolFirebase = useSchoolFirebase()
  const { trackFeatureUsed, trackConversion, trackError } = useAnalytics()

  // Scanner state
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualPlate, setManualPlate] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [hasFlash, setHasFlash] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  
  // OCR state
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null)
  
  // Vehicle creation state
  const [showVehicleCreation, setShowVehicleCreation] = useState(false)
  const [vehicleData, setVehicleData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    color: ''
  })
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false)

  // Mobile detection
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           !!(navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
  }, [])

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setCameras(videoDevices)

      if (videoDevices.length === 0) {
        throw new Error('No cameras found on this device')
      }

      // Select camera (prefer back camera on mobile)
      let selectedDeviceId = videoDevices[currentCameraIndex]?.deviceId
      if (isMobileDevice() && videoDevices.length > 1 && currentCameraIndex === 0) {
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        )
        if (backCamera) {
          selectedDeviceId = backCamera.deviceId
        }
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: isMobileDevice() ? 'environment' : 'user'
        }
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }

      // Check for flash support
      const track = mediaStream.getVideoTracks()[0]
      const capabilities = track.getCapabilities?.()
      setHasFlash(!!(capabilities as any)?.torch)

    } catch (error: any) {
      console.error('[License Plate Scanner] Camera error:', error)
      let errorMessage = 'Failed to access camera.'
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please make sure your device has a camera.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application.'
      }
      
      setError(errorMessage)
      trackError('license_plate_camera_error', errorMessage, { device: navigator.userAgent })
    } finally {
      setIsLoading(false)
    }
  }, [currentCameraIndex, isMobileDevice, trackError])

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (cameras.length < 2) return
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length
    setCurrentCameraIndex(nextIndex)
    
    // Cleanup current stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    // Will trigger reinitialization
  }, [cameras.length, currentCameraIndex, stream])

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!stream || !hasFlash) return

    try {
      const track = stream.getVideoTracks()[0]
      await track.applyConstraints({
        advanced: [{ torch: !flashEnabled } as any]
      })
      setFlashEnabled(!flashEnabled)
    } catch (error) {
      console.error('Failed to toggle flash:', error)
    }
  }, [stream, hasFlash, flashEnabled])

  // Capture and process image
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    trackFeatureUsed('license_plate_capture_attempt')
    setIsProcessing(true)
    setOcrProgress(0)
    setDetectedPlate(null)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx) throw new Error('Canvas context not available')

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Apply image preprocessing for better OCR
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      preprocessImage(ctx, imageData)

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
      })

      console.log('[License Plate Scanner] Starting OCR processing with OCR.Space API...')
      setOcrProgress(20)

      // Perform OCR with OCR.Space API (more accurate for license plates)
      const formData = new FormData()
      formData.append('file', blob, 'license-plate.jpg')
      formData.append('language', 'eng')
      formData.append('isOverlayRequired', 'false')
      formData.append('detectOrientation', 'true') // Help with tilted plates
      formData.append('scale', 'true')
      formData.append('isTable', 'false') 
      formData.append('OCREngine', '2') // Use OCR Engine 2 which is better for license plates
      formData.append('filetype', 'jpg')
      
      setOcrProgress(50)
      
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'apikey': 'K87899142388957', // Free API key, limited requests
        },
        body: formData
      })
      
      const result = await response.json()
      console.log('[License Plate Scanner] OCR.Space result:', result)
      setOcrProgress(80)
      
      let text = ''
      if (!result.IsErroredOnProcessing && result.ParsedResults && result.ParsedResults[0]) {
        text = result.ParsedResults[0].ParsedText
        console.log('[License Plate Scanner] OCR result:', text)
        setOcrProgress(100)
      } else {
        throw new Error('OCR processing failed: ' + (result.ErrorMessage || 'Unknown error'))
      }

      // Extract license plate from OCR text with multiple cleaning strategies
      console.log('[License Plate Scanner] Raw OCR text:', JSON.stringify(text))
      
      // Try different text cleaning strategies
      const strategies = [
        text.replace(/[^A-Z0-9]/g, '').trim(), // Remove all non-alphanumeric
        text.replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, '').trim(), // Allow spaces then remove
        text.toUpperCase().replace(/[^A-Z0-9]/g, '').trim(), // Uppercase first
        text.split('\n').map(line => line.replace(/[^A-Z0-9]/g, '').trim()).filter(line => line.length >= 5)[0] || '', // Try line by line
        text.match(/[A-Z0-9]{5,8}/g)?.[0] || '' // Regex match for license plate pattern
      ]
      
      console.log('[License Plate Scanner] Cleaning strategies results:', strategies)
      
      // Find the best candidate
      let cleanedText = ''
      for (const candidate of strategies) {
        if (candidate && candidate.length >= 5 && candidate.length <= 8) {
          cleanedText = candidate
          break
        }
      }
      
      if (cleanedText) {
        setDetectedPlate(cleanedText)
        await handleLicensePlateDetected(cleanedText)
        trackConversion('license_plate_detected', 1, { 
          plate_length: cleanedText.length,
          raw_text_length: text.length 
        })
      } else {
        console.log('[License Plate Scanner] No valid plate found, showing manual input')
        setError('Could not automatically detect license plate. Please enter it manually.')
        setShowManualInput(true)
        trackError('license_plate_auto_detection_failed', 'No valid plate pattern found', { 
          raw_text: text.substring(0, 100) // Limit for privacy
        })
      }

    } catch (error: any) {
      console.error('[License Plate Scanner] OCR error:', error)
      setError(error.message || 'Failed to process license plate. Please try again.')
      trackError('license_plate_ocr_error', error.message, { user_id: user?.id })
    } finally {
      setIsProcessing(false)
      setOcrProgress(0)
    }
  }, [user?.id, trackFeatureUsed, trackConversion, trackError])

  // Preprocess image for better OCR
  const preprocessImage = (ctx: CanvasRenderingContext2D, imageData: ImageData) => {
    const data = imageData.data
    
    // Convert to grayscale with higher contrast for license plates
    for (let i = 0; i < data.length; i += 4) {
      const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      
      // Apply stronger contrast and brightness adjustments for license plates
      let adjusted = grayscale
      
      // Increase contrast significantly
      adjusted = (adjusted - 128) * 2.0 + 128
      
      // Apply threshold to make text more distinct
      if (adjusted > 140) {
        adjusted = 255 // Make background white
      } else if (adjusted < 115) {
        adjusted = 0   // Make text black
      }
      
      const contrasted = Math.min(255, Math.max(0, adjusted))
      
      data[i] = contrasted     // Red
      data[i + 1] = contrasted // Green
      data[i + 2] = contrasted // Blue
    }
    
    ctx.putImageData(imageData, 0, 0)
  }

  // Handle detected license plate
  const handleLicensePlateDetected = async (licensePlate: string) => {
    try {
      console.log('[License Plate Scanner] Searching for vehicle with plate:', licensePlate)
      
      // Search for existing vehicle with this license plate
      const vehicles = await schoolFirebase.getVehicles()
      const existingVehicle = vehicles.find(v => 
        v.licensePlate.replace(/[^A-Z0-9]/g, '').toUpperCase() === licensePlate.toUpperCase()
      )

      if (existingVehicle && (existingVehicle.studentIds || []).length > 0) {
        // Vehicle found with students - proceed to add to queue
        console.log('[License Plate Scanner] Found existing vehicle:', existingVehicle)
        trackConversion('existing_vehicle_found', 1, { student_count: (existingVehicle.studentIds || []).length })
        
        onComplete({
          vehicleId: existingVehicle.id,
          studentIds: existingVehicle.studentIds || []
        })
        
        handleClose()
      } else {
        // Vehicle not found or has no students - show creation dialog
        console.log('[License Plate Scanner] Vehicle not found, opening creation dialog')
        trackFeatureUsed('new_vehicle_creation_flow')
        
        setVehicleData(prev => ({ ...prev, licensePlate }))
        await loadAvailableStudents()
        setShowVehicleCreation(true)
      }

    } catch (error: any) {
      console.error('[License Plate Scanner] Error searching for vehicle:', error)
      setError('Failed to search for vehicle. Please try again.')
      trackError('vehicle_search_error', error.message)
    }
  }

  // Load available students for vehicle association
  const loadAvailableStudents = async () => {
    try {
      const students = await schoolFirebase.getStudents()
      setAvailableStudents(students)
      
      // Auto-select all students if user only has a few
      if (students.length <= 3) {
        setSelectedStudentIds(students.map(s => s.id))
      }
    } catch (error) {
      console.error('Failed to load students:', error)
      setAvailableStudents([])
    }
  }

  // Handle manual license plate input
  const handleManualSubmit = useCallback(async () => {
    if (!manualPlate.trim()) return

    const cleanPlate = manualPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    trackFeatureUsed('license_plate_manual_entry')
    
    setShowManualInput(false)
    setManualPlate('')
    
    await handleLicensePlateDetected(cleanPlate)
  }, [manualPlate, trackFeatureUsed])

  // Create vehicle with selected students
  const handleCreateVehicle = async () => {
    if (!vehicleData.licensePlate || selectedStudentIds.length === 0) return

    setIsCreatingVehicle(true)

    try {
      console.log('[License Plate Scanner] Creating vehicle:', vehicleData)
      
      const vehicleId = await schoolFirebase.createVehicle({
        ...vehicleData,
        parentId: user!.id,
        studentIds: selectedStudentIds,
        qrCode: `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })

      trackConversion('vehicle_created_from_plate_scan', 1, {
        student_count: selectedStudentIds.length,
        has_vehicle_details: !!(vehicleData.make || vehicleData.model || vehicleData.color)
      })

      console.log('[License Plate Scanner] Vehicle created successfully:', vehicleId)
      
      // Complete the flow with new vehicle
      onComplete({
        vehicleId,
        studentIds: selectedStudentIds
      })

      handleClose()

    } catch (error: any) {
      console.error('[License Plate Scanner] Error creating vehicle:', error)
      setError('Failed to create vehicle. Please try again.')
      trackError('vehicle_creation_error', error.message)
    } finally {
      setIsCreatingVehicle(false)
    }
  }

  // Initialize camera when component opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera()
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
    }
  }, [isOpen, currentCameraIndex])

  // Cleanup
  const handleClose = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    
    setError(null)
    setIsLoading(false)
    setIsProcessing(false)
    setDetectedPlate(null)
    setShowManualInput(false)
    setShowVehicleCreation(false)
    setManualPlate('')
    setVehicleData({ licensePlate: '', make: '', model: '', color: '' })
    setSelectedStudentIds([])
    
    onClose()
  }, [stream, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Main Scanner Dialog */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: { xs: '100%', sm: 600 },
            height: { xs: '100%', sm: 'auto' },
            backgroundColor: 'white',
            borderRadius: { xs: 0, sm: 2 },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: 'primary.main',
            color: 'white'
          }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DirectionsCar />
              Scan License Plate
            </Typography>
            <IconButton onClick={handleClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>

          {/* Camera View or Manual Input */}
          {!showManualInput ? (
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              height: { xs: '60vh', sm: 450 },
              backgroundColor: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Loading State */}
              {isLoading && (
                <Box sx={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: 'white',
                  zIndex: 2
                }}>
                  <CameraAlt sx={{ fontSize: 48, mb: 1 }} />
                  <Typography>Initializing camera...</Typography>
                </Box>
              )}

              {/* Processing State */}
              {isProcessing && (
                <Box sx={{ 
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: 'white',
                  zIndex: 3,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  p: 3,
                  borderRadius: 2
                }}>
                  <CircularProgress 
                    variant={ocrProgress > 0 ? 'determinate' : 'indeterminate'} 
                    value={ocrProgress}
                    sx={{ color: 'white', mb: 2 }}
                  />
                  <Typography>
                    {ocrProgress > 0 ? `Processing... ${ocrProgress}%` : 'Reading license plate...'}
                  </Typography>
                </Box>
              )}

              {/* Error State */}
              {error && (
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  zIndex: 2
                }}>
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {error}
                  </Alert>
                </Box>
              )}

              {/* Video Feed */}
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                playsInline
                muted
              />

              {/* Hidden Canvas for Image Processing */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Camera Controls */}
              {stream && !error && !isProcessing && (
                <>
                  {/* Top Controls */}
                  <Box sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    display: 'flex',
                    gap: 1,
                    zIndex: 3
                  }}>
                    {cameras.length > 1 && (
                      <IconButton
                        onClick={switchCamera}
                        sx={{ 
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                        }}
                      >
                        <Cameraswitch />
                      </IconButton>
                    )}
                    
                    {hasFlash && (
                      <IconButton
                        onClick={toggleFlash}
                        sx={{ 
                          backgroundColor: flashEnabled ? 'rgba(255,255,0,0.3)' : 'rgba(255,255,255,0.2)',
                          color: 'white',
                          '&:hover': { backgroundColor: flashEnabled ? 'rgba(255,255,0,0.5)' : 'rgba(255,255,255,0.3)' }
                        }}
                      >
                        {flashEnabled ? <FlashOff /> : <FlashOn />}
                      </IconButton>
                    )}
                  </Box>

                  {/* Capture Button */}
                  <Box sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 3
                  }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={captureImage}
                      disabled={isProcessing}
                      sx={{
                        borderRadius: '50%',
                        minWidth: 80,
                        height: 80,
                        fontSize: '2rem'
                      }}
                    >
                      📷
                    </Button>
                  </Box>

                  {/* License Plate Guide Overlay */}
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: 300, sm: 400 },
                    height: { xs: 100, sm: 120 },
                    border: '3px solid rgba(0,255,0,0.7)',
                    borderRadius: 2,
                    pointerEvents: 'none',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography 
                      sx={{ 
                        color: 'rgba(0,255,0,0.9)', 
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        p: 1,
                        borderRadius: 1,
                        fontSize: { xs: '0.9rem', sm: '1rem' }
                      }}
                    >
                      Align license plate here
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          ) : (
            /* Manual Input Form */
            <Box sx={{ p: 3, minHeight: { xs: '60vh', sm: 450 } }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Enter License Plate Manually
              </Typography>
              
              <TextField
                fullWidth
                label="License Plate"
                value={manualPlate}
                onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                placeholder="ABC123 or ABC-123"
                autoFocus
                helperText="Enter the vehicle's license plate number"
                sx={{ mb: 3 }}
                inputProps={{
                  style: {
                    textTransform: 'uppercase',
                    fontSize: '1.4rem',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleManualSubmit}
                  disabled={!manualPlate.trim()}
                  fullWidth
                  size="large"
                >
                  Search Vehicle
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowManualInput(false)}
                  fullWidth
                  size="large"
                >
                  Back to Camera
                </Button>
              </Box>
            </Box>
          )}

          {/* Bottom Actions */}
          {!showManualInput && !isProcessing && (
            <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Position the license plate within the green guide and tap the camera button
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleClose}
                  sx={{ flex: 1 }}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="text"
                  startIcon={<Keyboard />}
                  onClick={() => setShowManualInput(true)}
                  sx={{ flex: 1 }}
                >
                  Enter Manually
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Vehicle Creation Dialog */}
      <Dialog
        open={showVehicleCreation}
        onClose={() => setShowVehicleCreation(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobileDevice()}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DirectionsCar />
            Add New Vehicle: {vehicleData.licensePlate}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This license plate wasn't found in the system. Please add vehicle details and select associated students.
          </Typography>

          {/* Vehicle Details */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Vehicle Details (Optional)</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Make"
                value={vehicleData.make}
                onChange={(e) => setVehicleData(prev => ({ ...prev, make: e.target.value }))}
                placeholder="Toyota, Honda, Ford..."
              />
              
              <TextField
                label="Model"
                value={vehicleData.model}
                onChange={(e) => setVehicleData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Camry, Civic, F-150..."
              />
              
              <TextField
                label="Color"
                value={vehicleData.color}
                onChange={(e) => setVehicleData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="Red, Blue, White..."
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Student Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person />
              Associate Students with this Vehicle *
            </Typography>

            {availableStudents.length === 0 ? (
              <Alert severity="info">
                No students found. Please add students first before creating vehicles.
              </Alert>
            ) : (
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {availableStudents.map((student) => (
                  <Card key={student.id} sx={{ mb: 1 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds(prev => [...prev, student.id])
                              } else {
                                setSelectedStudentIds(prev => prev.filter(id => id !== student.id))
                              }
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="subtitle2">{student.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Grade {student.grade}
                            </Typography>
                          </Box>
                        }
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {selectedStudentIds.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Selected: {selectedStudentIds.length} student(s)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {selectedStudentIds.map(studentId => {
                    const student = availableStudents.find(s => s.id === studentId)
                    return student ? (
                      <Chip 
                        key={studentId}
                        label={student.name}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : null
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setShowVehicleCreation(false)}
            disabled={isCreatingVehicle}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateVehicle}
            variant="contained"
            disabled={selectedStudentIds.length === 0 || isCreatingVehicle}
            startIcon={isCreatingVehicle ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {isCreatingVehicle ? 'Creating...' : 'Create Vehicle & Add to Queue'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}