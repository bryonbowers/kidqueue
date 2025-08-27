import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  AccountCircle as AccountIcon,
  CreditCard as CreditCardIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/FirebaseAuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { Subscription, SubscriptionPlan } from '../types/subscription';

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individual teachers or small schools',
    price: 999,
    interval: 'month',
    studentLimit: 100,
    schoolLimit: 1,
    stripePriceId: 'price_1S0OokGHvMGa8SVhsSOpJRoK',
    features: [
      'Up to 100 students',
      '1 school',
      'QR code generation',
      'Basic pickup management',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for schools and small districts',
    price: 2999,
    interval: 'month',
    studentLimit: 1000,
    schoolLimit: 5,
    stripePriceId: 'price_1S0OolGHvMGa8SVhVBqXsHyN',
    features: [
      'Up to 1,000 students',
      'Up to 5 schools',
      'Advanced analytics',
      'Priority pickup queues',
      'Phone & email support',
      '30-day free trial'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large districts and organizations',
    price: 9999,
    interval: 'month',
    studentLimit: null,
    schoolLimit: null,
    stripePriceId: 'price_1S0OolGHvMGa8SVh70orLRU2',
    features: [
      'Unlimited students',
      'Unlimited schools',
      'Custom integrations',
      'Dedicated support',
      'Advanced reporting',
      'Custom training'
    ]
  }
];

export const MyAccountPage: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{studentCount: number, schoolCount: number} | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
      loadUsageData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    try {
      console.log('Loading subscription for user:', user!.id);
      const subData = await subscriptionService.getUserSubscription(user!.id);
      console.log('Loaded subscription data:', subData);
      setSubscription(subData);
    } catch (error) {
      console.error('Error loading subscription:', error);
      if (error instanceof Error) {
        if (error.message.includes('permissions') || error.message.includes('Permission')) {
          setError('Unable to access subscription data. Please check your account permissions.');
        } else {
          setError(`Failed to load subscription data: ${error.message}`);
        }
      } else {
        setError('Failed to load subscription data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsageData = async () => {
    try {
      const usageData = await subscriptionService.getUserUsage(user!.id);
      setUsage(usageData);
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setUpgradeDialogOpen(true);
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !user) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const success = await subscriptionService.createCheckoutSession(
        selectedPlan.id,
        user.id,
        `${window.location.origin}/my-account?success=true`,
        `${window.location.origin}/my-account?canceled=true`
      );

      if (success) {
        setUpgradeDialogOpen(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError('Failed to start checkout process');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;

    try {
      await subscriptionService.cancelSubscription(user.id);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setError('Failed to cancel subscription');
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getCurrentPlan = (): SubscriptionPlan | null => {
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS.find(plan => plan.id === subscription.planId) || null;
  };

  const isUpgrade = (plan: SubscriptionPlan): boolean => {
    const currentPlan = getCurrentPlan();
    if (!currentPlan) return true;
    
    const currentIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === currentPlan.id);
    const planIndex = SUBSCRIPTION_PLANS.findIndex(p => p.id === plan.id);
    return planIndex > currentIndex;
  };

  const getUsageLimitStatus = (current: number, limit: number | null): 'safe' | 'warning' | 'danger' => {
    if (limit === null) return 'safe';
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'danger';
    if (percentage >= 75) return 'warning';
    return 'safe';
  };

  const getUsageLimitColor = (status: 'safe' | 'warning' | 'danger') => {
    switch (status) {
      case 'danger': return 'error';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <AccountIcon />
        </Avatar>
        <Typography variant="h4" component="h1">
          My Account
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Account Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon /> Account Information
        </Typography>
        <Box sx={{ ml: 4 }}>
          <Typography><strong>Name:</strong> {user?.name || 'Not provided'}</Typography>
          <Typography><strong>Email:</strong> {user?.email}</Typography>
          <Typography><strong>Account Created:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</Typography>
        </Box>
      </Paper>

      {/* Current Subscription */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreditCardIcon /> Current Subscription
        </Typography>
        
        {subscription && currentPlan ? (
          <Box sx={{ ml: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h5">{currentPlan.name}</Typography>
              <Chip 
                label={subscription.status === 'active' ? 'Active' : subscription.status} 
                color={subscription.status === 'active' ? 'success' : 'default'} 
              />
              {subscription.cancelAtPeriodEnd && (
                <Chip label="Cancels at period end" color="warning" />
              )}
            </Box>
            
            <Typography><strong>Price:</strong> {formatPrice(currentPlan.price)}/month</Typography>
            <Typography><strong>Billing Period:</strong> {subscription.currentPeriodStart?.toDate().toLocaleDateString()} - {subscription.currentPeriodEnd?.toDate().toLocaleDateString()}</Typography>
            
            {subscription.trialEndsAt && new Date(subscription.trialEndsAt.seconds * 1000) > new Date() && (
              <Typography color="primary"><strong>Trial ends:</strong> {new Date(subscription.trialEndsAt.seconds * 1000).toLocaleDateString()}</Typography>
            )}
            
            <Box sx={{ mt: 2 }}>
              {!subscription.cancelAtPeriodEnd && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={handleCancelSubscription}
                  sx={{ mr: 2 }}
                >
                  Cancel Subscription
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <Alert severity="info" sx={{ ml: 4 }}>
            You don't have an active subscription. Choose a plan below to get started.
          </Alert>
        )}
      </Paper>

      {/* Usage Statistics */}
      {usage && currentPlan && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon /> Usage Statistics
          </Typography>
          
          <Grid container spacing={3} sx={{ ml: 2 }}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>Students</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h4">
                    {usage.studentCount}
                  </Typography>
                  <Typography color="text.secondary">
                    / {currentPlan.studentLimit || '∞'}
                  </Typography>
                  <Chip 
                    size="small"
                    label={getUsageLimitStatus(usage.studentCount, currentPlan.studentLimit)}
                    color={getUsageLimitColor(getUsageLimitStatus(usage.studentCount, currentPlan.studentLimit))}
                  />
                </Box>
                {currentPlan.studentLimit && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round((usage.studentCount / currentPlan.studentLimit) * 100)}% of limit used
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>Schools</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h4">
                    {usage.schoolCount}
                  </Typography>
                  <Typography color="text.secondary">
                    / {currentPlan.schoolLimit || '∞'}
                  </Typography>
                  <Chip 
                    size="small"
                    label={getUsageLimitStatus(usage.schoolCount, currentPlan.schoolLimit)}
                    color={getUsageLimitColor(getUsageLimitStatus(usage.schoolCount, currentPlan.schoolLimit))}
                  />
                </Box>
                {currentPlan.schoolLimit && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round((usage.schoolCount / currentPlan.schoolLimit) * 100)}% of limit used
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Available Plans */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarIcon /> {subscription ? 'Upgrade Your Plan' : 'Choose a Plan'}
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id;
            const canUpgrade = !subscription || isUpgrade(plan);
            
            return (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: isCurrent ? '2px solid' : '1px solid',
                    borderColor: isCurrent ? 'primary.main' : 'divider',
                    position: 'relative'
                  }}
                >
                  {isCurrent && (
                    <Chip 
                      label="Current Plan" 
                      color="primary" 
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16 }}
                    />
                  )}
                  
                  <CardContent>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Typography variant="h3" color="primary" gutterBottom>
                      {formatPrice(plan.price)}
                      <Typography variant="body2" component="span" color="text.secondary">
                        /month
                      </Typography>
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <List dense>
                      {plan.features.map((feature, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={feature} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    {isCurrent ? (
                      <Button fullWidth disabled>
                        Current Plan
                      </Button>
                    ) : canUpgrade ? (
                      <Button 
                        fullWidth 
                        variant="contained"
                        onClick={() => handleUpgrade(plan)}
                      >
                        {subscription ? 'Upgrade' : 'Select Plan'}
                      </Button>
                    ) : (
                      <Button fullWidth disabled>
                        Downgrade (Contact Support)
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {subscription ? 'Upgrade Plan' : 'Select Plan'}
        </DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedPlan.name} - {formatPrice(selectedPlan.price)}/month
              </Typography>
              
              <List dense>
                {selectedPlan.features.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
              
              {subscription && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Your new plan will take effect immediately. You'll be charged a prorated amount for the remainder of your billing period.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCheckout} 
            variant="contained"
            disabled={checkoutLoading}
          >
            {checkoutLoading ? <CircularProgress size={24} /> : 'Continue to Checkout'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};