import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (token) {
      login(token)
      navigate('/', { replace: true })
    } else if (error) {
      console.error('Authentication error:', error)
      navigate('/login', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [searchParams, login, navigate])

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      gap={2}
    >
      <CircularProgress />
      <Typography>Completing sign in...</Typography>
    </Box>
  )
}