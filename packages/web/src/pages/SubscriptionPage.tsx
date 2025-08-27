import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material'
import { 
  Check, 
  Star, 
  CreditCard,
  School,
  QrCode,
  DirectionsCar,
  Analytics,
  Api,
  Support,
  Security
} from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SubscriptionService, { subscriptionPlans } from '../services/subscriptionService'
import { UserSubscription } from '../types/subscription'

const featureIcons: Record<string, any> = {
  'students': School,
  'schools': School,
  'QR code': QrCode,
  'License plate': DirectionsCar,
  'analytics': Analytics,
  'API': Api,
  'support': Support,
  'branding': Star,
  'reporting': Analytics,
  'SLA': Security
}

function getFeatureIcon(feature: string) {
  for (const [key, icon] of Object.entries(featureIcons)) {
    if (feature.toLowerCase().includes(key.toLowerCase())) {
      return icon
    }
  }
  return Check
}

export default function SubscriptionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [usageData, setUsageData] = useState({
    studentsUsed: 0,
    schoolsUsed: 0,
    studentsLimit: null as number | null,
    schoolsLimit: null as number | null
  })

  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const subscription = await SubscriptionService.getUserSubscription(user.id)
        setCurrentSubscription(subscription)
        
        const usage = await SubscriptionService.checkUsageLimits(user.id)
        setUsageData({
          studentsUsed: usage.studentsUsed,
          schoolsUsed: usage.schoolsUsed,
          studentsLimit: usage.studentsLimit,
          schoolsLimit: usage.schoolsLimit
        })
      } catch (error) {
        console.error('Error loading subscription data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSubscriptionData()
  }, [user])

  // Handle checkout success/cancel
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'success') {
      // Refresh subscription data
      window.location.href = '/dashboard'
    }
  }, [searchParams])

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    setSubscribing(planId)
    try {
      await SubscriptionService.redirectToCheckout(planId, user.id)
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription process. Please try again.')
      setSubscribing(null)
    }
  }

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId && currentSubscription?.status === 'active'
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Subscription Plans
        </Typography>
        <LinearProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Select the perfect plan for your school or district
        </Typography>
        
        {currentSubscription && (
          <Alert severity="info" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            You are currently on the <strong>
              {subscriptionPlans.find(p => p.id === currentSubscription.planId)?.name || 'Unknown'}
            </strong> plan. 
            {currentSubscription.status === 'active' ? (
              ` Your next billing date is ${currentSubscription.currentPeriodEnd.toLocaleDateString()}.`
            ) : (
              ` Status: ${currentSubscription.status}`
            )}
          </Alert>
        )}
      </Box>

      {/* Usage Summary for Current Users */}
      {currentSubscription && (
        <Paper sx={{ p: 3, mb: 4, maxWidth: 800, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Current Usage
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Students
                </Typography>
                <Typography variant="h6">
                  {usageData.studentsUsed}
                  {usageData.studentsLimit && ` / ${usageData.studentsLimit}`}
                </Typography>
                {usageData.studentsLimit && (
                  <LinearProgress 
                    variant="determinate" 
                    value={(usageData.studentsUsed / usageData.studentsLimit) * 100}
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Schools
                </Typography>
                <Typography variant="h6">
                  {usageData.schoolsUsed}
                  {usageData.schoolsLimit && ` / ${usageData.schoolsLimit}`}
                </Typography>
                {usageData.schoolsLimit && (
                  <LinearProgress 
                    variant="determinate" 
                    value={(usageData.schoolsUsed / usageData.schoolsLimit) * 100}
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Pricing Plans */}
      <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
        {subscriptionPlans.map((plan) => (
          <Grid item xs={12} md={4} key={plan.id}>
            <Card 
              sx={{ 
                height: '100%', 
                position: 'relative',
                border: plan.popular ? '2px solid' : '1px solid',
                borderColor: plan.popular ? 'primary.main' : 'divider',
                transform: plan.popular ? 'scale(1.05)' : 'none',
                boxShadow: plan.popular ? 3 : 1
              }}
            >
              {plan.popular && (
                <Chip 
                  label="Most Popular" 
                  color="primary" 
                  size="small" 
                  sx={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)' }}
                />
              )}
              
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {plan.name}
                  </Typography>
                  
                  <Typography variant="h3" color="primary" gutterBottom>
                    ${(plan.price / 100).toFixed(0)}
                    <Typography component="span" variant="body1" color="text.secondary">
                      /{plan.interval}
                    </Typography>
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    {plan.description}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Plan Limits */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Limits:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Students: {plan.studentLimit ? plan.studentLimit.toLocaleString() : 'Unlimited'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Schools: {plan.schoolLimit ? plan.schoolLimit.toLocaleString() : 'Unlimited'}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Features List */}
                <List dense sx={{ mb: 2 }}>
                  {plan.features.map((feature, index) => {
                    const IconComponent = getFeatureIcon(feature)
                    return (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <IconComponent color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    )
                  })}
                </List>

                {/* Action Button */}
                <Button
                  variant={plan.popular ? "contained" : "outlined"}
                  fullWidth
                  size="large"
                  disabled={subscribing === plan.id || isCurrentPlan(plan.id)}
                  onClick={() => handleSubscribe(plan.id)}
                  startIcon={subscribing === plan.id ? <CreditCard /> : undefined}
                  sx={{ mt: 2 }}
                >
                  {subscribing === plan.id ? 'Processing...' : 
                   isCurrentPlan(plan.id) ? 'Current Plan' : 
                   currentSubscription ? 'Switch Plan' : 'Get Started'}
                </Button>

                {plan.id === 'professional' && !currentSubscription && (
                  <Typography variant="caption" display="block" sx={{ textAlign: 'center', mt: 1 }}>
                    30-day free trial included
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Info */}
      <Box sx={{ mt: 6, maxWidth: 800, mx: 'auto', textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          All Plans Include:
        </Typography>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[
            'Secure cloud hosting',
            'Real-time queue updates',
            'Mobile-friendly interface',
            'Data backup & security',
            'Regular feature updates',
            '99.9% uptime guarantee'
          ].map((feature, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Check color="primary" fontSize="small" />
                <Typography variant="body2">{feature}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          Questions about pricing? Contact us at{' '}
          <strong>bryon.bowers@gmail.com</strong>
        </Typography>
      </Box>
    </Box>
  )
}