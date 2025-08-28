import { useEffect, useRef, useState, useCallback } from 'react'
import { Box, Button, Typography, Alert, IconButton, TextField, Snackbar } from '@mui/material'
import { Close, QrCodeScanner, Keyboard, CameraAlt, FlashOn, FlashOff, Cameraswitch } from '@mui/icons-material'
import QrScanner from 'qr-scanner'

interface QRScannerProps {
  onScan: (result: string) => void
  onClose: () => void
  isOpen: boolean
}

export default function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanner, setScanner] = useState<QrScanner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [hasFlash, setHasFlash] = useState(false)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([])
  const [currentCameraId, setCurrentCameraId] = useState<string>('')
  const [scanSuccess, setScanSuccess] = useState(false)

  // Improved mobile detection
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
           window.matchMedia('(max-width: 768px)').matches
  }, [])

  // Check camera permissions with better mobile handling
  const checkCameraPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: isMobileDevice() ? 'environment' : 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        } 
      })
      
      // Immediately stop the stream - we just wanted to check permissions
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (error: any) {
      console.error('Camera permission check failed:', error)
      return false
    }
  }, [isMobileDevice])

  // Initialize QR scanner with improved mobile support
  const initializeScanner = useCallback(async () => {
    if (!videoRef.current || !isOpen) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('[QR Scanner] Initializing scanner...')

      // Check if camera permission is available
      const hasPermission = await checkCameraPermissions()
      if (!hasPermission) {
        throw new Error('Camera permission denied. Please allow camera access and try again.')
      }

      // Get available cameras
      const availableCameras = await QrScanner.listCameras(true)
      setCameras(availableCameras)
      console.log('[QR Scanner] Available cameras:', availableCameras)

      // Select the best camera (prefer back camera on mobile)
      let selectedCamera = availableCameras[0]
      if (isMobileDevice() && availableCameras.length > 1) {
        const backCamera = availableCameras.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('rear') ||
          camera.label.toLowerCase().includes('environment')
        )
        if (backCamera) {
          selectedCamera = backCamera
        }
      }

      setCurrentCameraId(selectedCamera?.id || '')

      // Create scanner with optimal settings for mobile
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('[QR Scanner] QR Code detected:', result.data)
          setScanSuccess(true)
          
          // Small delay to show success feedback
          setTimeout(() => {
            onScan(result.data)
            handleClose()
          }, 500)
        },
        {
          // Optimize for mobile devices
          preferredCamera: selectedCamera?.id,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: isMobileDevice() ? 2 : 5,
          calculateScanRegion: (video) => {
            // Create scan region for better mobile experience
            const smallerDimension = Math.min(video.videoWidth, video.videoHeight)
            const scanRegionSize = Math.round(0.6 * smallerDimension)
            
            return {
              x: Math.round((video.videoWidth - scanRegionSize) / 2),
              y: Math.round((video.videoHeight - scanRegionSize) / 2),
              width: scanRegionSize,
              height: scanRegionSize,
            }
          },
          // Return detailed results for better error handling
          returnDetailedScanResult: true,
        }
      )

      // Check if flash is available
      const hasFlashSupport = await qrScanner.hasFlash()
      setHasFlash(hasFlashSupport)
      console.log('[QR Scanner] Flash support:', hasFlashSupport)

      // Start scanning
      await qrScanner.start()
      console.log('[QR Scanner] Scanner started successfully')

      setScanner(qrScanner)
      setError(null)

    } catch (error: any) {
      console.error('[QR Scanner] Initialization error:', error)
      
      let errorMessage = 'Failed to initialize camera.'
      
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please make sure your device has a camera.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other apps using the camera.'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera configuration error. Trying with default settings...'
        // Try again with minimal constraints
        setTimeout(() => initializeScanner(), 1000)
        return
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [isOpen, onScan, checkCameraPermissions, isMobileDevice])

  // Switch camera (front/back on mobile)
  const switchCamera = useCallback(async () => {
    if (!scanner || cameras.length < 2) return

    try {
      const currentIndex = cameras.findIndex(cam => cam.id === currentCameraId)
      const nextIndex = (currentIndex + 1) % cameras.length
      const nextCamera = cameras[nextIndex]

      await scanner.setCamera(nextCamera.id)
      setCurrentCameraId(nextCamera.id)
    } catch (error) {
      console.error('Failed to switch camera:', error)
    }
  }, [scanner, cameras, currentCameraId])

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!scanner || !hasFlash) return

    try {
      if (flashEnabled) {
        await scanner.turnFlashOff()
        setFlashEnabled(false)
      } else {
        await scanner.turnFlashOn()
        setFlashEnabled(true)
      }
    } catch (error) {
      console.error('Failed to toggle flash:', error)
    }
  }, [scanner, hasFlash, flashEnabled])

  // Initialize scanner when component opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(initializeScanner, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initializeScanner])

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (scanner) {
        console.log('[QR Scanner] Cleaning up scanner...')
        scanner.stop()
        scanner.destroy()
        setScanner(null)
      }
      
      // Reset all state
      setError(null)
      setIsLoading(false)
      setShowManualInput(false)
      setManualCode('')
      setScanSuccess(false)
      setFlashEnabled(false)
      setHasFlash(false)
      setCameras([])
      setCurrentCameraId('')
    }
  }, [isOpen, scanner])

  const handleClose = useCallback(() => {
    setShowManualInput(false)
    setManualCode('')
    onClose()
  }, [onClose])

  const handleManualSubmit = useCallback(() => {
    if (!manualCode.trim()) return

    const input = manualCode.trim().toUpperCase()
    
    // If it's already a full QR code, use it as is
    if (input.startsWith('KIDQUEUE_VEHICLE_')) {
      onScan(input)
    } else {
      // Otherwise, treat it as a license plate and convert to QR format
      const cleanPlate = input.replace(/[-\s]/g, '')
      const qrCode = `KIDQUEUE_VEHICLE_${cleanPlate}`
      onScan(qrCode)
    }
    
    handleClose()
  }, [manualCode, onScan, handleClose])

  // Handle keyboard events for better UX
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return
      
      if (event.key === 'Escape') {
        handleClose()
      } else if (event.key === 'Enter' && showManualInput && manualCode.trim()) {
        handleManualSubmit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showManualInput, manualCode, handleClose, handleManualSubmit])

  if (!isOpen) return null

  return (
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
          maxWidth: { xs: '100%', sm: 500 },
          height: { xs: '100%', sm: 'auto' },
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
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
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          color: 'white',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScanner />
            Scan Vehicle QR Code
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>

        {/* Camera View */}
        {!showManualInput && (
          <Box sx={{ 
            position: 'relative', 
            width: '100%', 
            height: { xs: '60vh', sm: 400 },
            backgroundColor: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
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

            {/* Camera Controls */}
            {scanner && !error && (
              <Box sx={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 1,
                zIndex: 3
              }}>
                {cameras.length > 1 && (
                  <IconButton
                    onClick={switchCamera}
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { 
                        background: 'rgba(255, 255, 255, 0.3)',
                        transform: 'scale(1.05)'
                      }
                    }}
                  >
                    <Cameraswitch />
                  </IconButton>
                )}
                
                {hasFlash && (
                  <IconButton
                    onClick={toggleFlash}
                    sx={{ 
                      background: flashEnabled ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { 
                        background: flashEnabled ? 'rgba(255, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)',
                        transform: 'scale(1.05)'
                      }
                    }}
                  >
                    {flashEnabled ? <FlashOff /> : <FlashOn />}
                  </IconButton>
                )}
              </Box>
            )}

            {/* Scan Region Overlay */}
            {scanner && !error && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: 250, sm: 300 },
                height: { xs: 250, sm: 300 },
                border: '2px solid rgba(255,255,255,0.5)',
                borderRadius: 2,
                pointerEvents: 'none',
                zIndex: 1,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  border: '20px solid rgba(0,255,0,0.3)',
                  borderRadius: 2,
                  animation: scanSuccess ? 'pulse 0.5s ease-in-out' : 'none',
                },
                '@keyframes pulse': {
                  '0%': { borderColor: 'rgba(0,255,0,0.3)' },
                  '50%': { borderColor: 'rgba(0,255,0,0.8)' },
                  '100%': { borderColor: 'rgba(0,255,0,0.3)' },
                }
              }} />
            )}
          </Box>
        )}

        {/* Manual Input */}
        {showManualInput && (
          <Box sx={{ p: 3, minHeight: { xs: '60vh', sm: 400 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Enter License Plate Manually
            </Typography>
            
            <TextField
              fullWidth
              label="License Plate"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="ABC123 or ABC-123"
              autoFocus
              helperText="Enter the vehicle's license plate number"
              sx={{ mb: 3 }}
              inputProps={{
                style: {
                  textTransform: 'uppercase',
                  fontSize: '1.2rem',
                  textAlign: 'center'
                }
              }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                fullWidth
                size="large"
              >
                Submit
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
        {!showManualInput && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              Point your camera at the vehicle's QR code sticker or barcode
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

      {/* Success Snackbar */}
      <Snackbar
        open={scanSuccess}
        message="✅ QR Code scanned successfully!"
        autoHideDuration={2000}
        onClose={() => setScanSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Box>
  )
}