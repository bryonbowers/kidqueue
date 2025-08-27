import {
  Box,
  Paper,
  Typography,
  Button,
  Container,
  Stack,
  Divider,
  Alert,
} from '@mui/material'
import { Google, Facebook } from '@mui/icons-material'
import { useState } from 'react'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useAnalytics } from '../hooks/useAnalytics'

export default function LoginPage() {
  const { signInWithGoogle, signInWithFacebook } = useAuth()
  const { trackLogin, trackError, trackFeatureUsed } = useAnalytics()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      trackFeatureUsed('google_login_attempt')
      await signInWithGoogle()
      trackLogin('google')
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in with Google'
      setError(errorMessage)
      trackError('login_failed', errorMessage, { method: 'google' })
    } finally {
      setLoading(false)
    }
  }

  const handleFacebookLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      trackFeatureUsed('facebook_login_attempt')
      await signInWithFacebook()
      trackLogin('facebook')
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in with Facebook'
      setError(errorMessage)
      trackError('login_failed', errorMessage, { method: 'facebook' })
    } finally {
      setLoading(false)
    }
  }

  const handleAppleLogin = () => {
    trackFeatureUsed('apple_login_attempt')
    setError('Apple Sign-In is not yet configured')
    trackError('login_failed', 'Apple Sign-In not configured', { method: 'apple' })
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
            KidQueue
          </Typography>
          <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
            School Pickup Management
          </Typography>
          <Typography variant="body2" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
            Streamline your school pickup experience with QR code-based queue management
          </Typography>

          <Box sx={{ width: '100%', maxWidth: 300 }}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
              Sign in to continue
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Stack spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Google />}
                onClick={handleGoogleLogin}
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderColor: '#db4437',
                  color: '#db4437',
                  '&:hover': {
                    borderColor: '#c23321',
                    backgroundColor: '#db44371a',
                  },
                }}
              >
                {loading ? 'Signing in...' : 'Continue with Google'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Facebook />}
                onClick={handleFacebookLogin}
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderColor: '#4267B2',
                  color: '#4267B2',
                  '&:hover': {
                    borderColor: '#365899',
                    backgroundColor: '#4267B21a',
                  },
                }}
              >
                {loading ? 'Signing in...' : 'Continue with Facebook'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleAppleLogin}
                sx={{
                  py: 1.5,
                  borderColor: '#000',
                  color: '#000',
                  '&:hover': {
                    borderColor: '#000',
                    backgroundColor: '#0001',
                  },
                }}
              >
                Continue with Apple
              </Button>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
              New to KidQueue? Your account will be created automatically when you sign in.
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            For teachers and school staff, please contact your administrator for access.
          </Typography>
        </Box>
      </Box>
    </Container>
  )
}