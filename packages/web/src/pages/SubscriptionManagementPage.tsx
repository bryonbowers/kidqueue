import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Divider,
  LinearProgress
} from '@mui/material'
import { 
  Subscriptions, 
  TrendingUp, 
  People, 
  School, 
  AttachMoney,
  Analytics,
  Security
} from '@mui/icons-material'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useNavigate } from 'react-router-dom'
import SubscriptionService, { subscriptionPlans } from '../services/subscriptionService'
import { UserSubscription } from '../types/subscription'

export default function SubscriptionManagementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    monthlyRevenue: 0,
    activeTrials: 0,
    churnRate: 0
  })

  // Check if user is admin
  useEffect(() => {
    if (!user || !SubscriptionService.isAdmin(user.email)) {
      navigate('/dashboard')
      return
    }
  }, [user, navigate])

  // Load subscription data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const subs = await SubscriptionService.getAllSubscriptions()
        setSubscriptions(subs)
        
        // Calculate stats
        const activeCount = subs.filter(s => s.status === 'active').length
        const trialCount = subs.filter(s => s.status === 'trialing').length
        const monthlyRev = subs
          .filter(s => s.status === 'active')
          .reduce((total, sub) => {
            const plan = subscriptionPlans.find(p => p.id === sub.planId)
            return total + (plan?.price || 0)
          }, 0) / 100 // Convert from cents

        setStats({
          totalSubscribers: activeCount,
          monthlyRevenue: monthlyRev,
          activeTrials: trialCount,
          churnRate: 0 // Would need historical data to calculate
        })
      } catch (error) {
        console.error('Error loading subscription data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && SubscriptionService.isAdmin(user.email)) {
      loadData()
    }
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'trialing': return 'info'
      case 'past_due': return 'warning'
      case 'canceled': return 'error'
      default: return 'default'
    }
  }

  if (!user || !SubscriptionService.isAdmin(user.email)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. This page is only available to administrators.
        </Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Subscription Management
        </Typography>
        <LinearProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Security />
        Subscription Management
      </Typography>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Subscribers
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalSubscribers}
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h4">
                    ${stats.monthlyRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <AttachMoney color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Trials
                  </Typography>
                  <Typography variant="h4">
                    {stats.activeTrials}
                  </Typography>
                </Box>
                <TrendingUp color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Churn Rate
                  </Typography>
                  <Typography variant="h4">
                    {stats.churnRate.toFixed(1)}%
                  </Typography>
                </Box>
                <Analytics color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Subscription Plans Overview */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Subscriptions />
          Subscription Plans
        </Typography>
        
        <Grid container spacing={3}>
          {subscriptionPlans.map((plan) => {
            const planSubscriptions = subscriptions.filter(s => s.planId === plan.id && s.status === 'active')
            const planRevenue = planSubscriptions.length * (plan.price / 100)
            
            return (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  {plan.popular && (
                    <Chip 
                      label="Popular" 
                      color="primary" 
                      size="small" 
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Typography variant="h4" color="primary" gutterBottom>
                      ${(plan.price / 100).toFixed(0)}
                      <Typography component="span" variant="body2" color="text.secondary">
                        /{plan.interval}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {plan.description}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Active Subscribers: {planSubscriptions.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Monthly Revenue: ${planRevenue.toFixed(0)}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>
                      Features:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <Typography component="li" variant="body2" key={idx}>
                          {feature}
                        </Typography>
                      ))}
                      {plan.features.length > 3 && (
                        <Typography component="li" variant="body2" color="text.secondary">
                          +{plan.features.length - 3} more...
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Paper>

      {/* Subscription List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          All Subscriptions ({subscriptions.length})
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User ID</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Revenue</TableCell>
                <TableCell>Current Period</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.map((subscription) => {
                const plan = subscriptionPlans.find(p => p.id === subscription.planId)
                
                return (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {subscription.userId.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {plan?.name || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ${((plan?.price || 0) / 100).toFixed(0)}/{plan?.interval || 'month'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={subscription.status} 
                        color={getStatusColor(subscription.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ${((plan?.price || 0) / 100).toFixed(0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {subscription.currentPeriodStart.toLocaleDateString()} - {subscription.currentPeriodEnd.toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {subscription.createdAt.toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          // TODO: Implement subscription details modal
                          console.log('View subscription:', subscription.id)
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {subscriptions.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No subscriptions found. Users will appear here once they subscribe to a plan.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}