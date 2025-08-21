import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Card, Title, Paragraph } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function LoginScreen() {
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/auth/google`,
        AuthSession.makeRedirectUri({ useProxy: true })
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        
        if (token) {
          await login(token);
        } else {
          Alert.alert('Login Failed', 'No authentication token received');
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Login Error', 'Failed to authenticate with Google');
    }
  };

  const handleFacebookLogin = async () => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/auth/facebook`,
        AuthSession.makeRedirectUri({ useProxy: true })
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        
        if (token) {
          await login(token);
        } else {
          Alert.alert('Login Failed', 'No authentication token received');
        }
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      Alert.alert('Login Error', 'Failed to authenticate with Facebook');
    }
  };

  const handleAppleLogin = async () => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/auth/apple`,
        AuthSession.makeRedirectUri({ useProxy: true })
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        
        if (token) {
          await login(token);
        } else {
          Alert.alert('Login Failed', 'No authentication token received');
        }
      }
    } catch (error) {
      console.error('Apple login error:', error);
      Alert.alert('Login Error', 'Failed to authenticate with Apple');
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>KidQueue</Title>
          <Paragraph style={styles.subtitle}>School Pickup Management</Paragraph>
          <Paragraph style={styles.description}>
            Streamline your school pickup experience with QR code-based queue management
          </Paragraph>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={handleGoogleLogin}
          style={[styles.button, styles.googleButton]}
          contentStyle={styles.buttonContent}
        >
          Continue with Google
        </Button>

        <Button
          mode="outlined"
          onPress={handleFacebookLogin}
          style={[styles.button, styles.facebookButton]}
          contentStyle={styles.buttonContent}
        >
          Continue with Facebook
        </Button>

        <Button
          mode="outlined"
          onPress={handleAppleLogin}
          style={[styles.button, styles.appleButton]}
          contentStyle={styles.buttonContent}
        >
          Continue with Apple
        </Button>
      </View>

      <Text style={styles.footerText}>
        New to KidQueue? Your account will be created automatically when you sign in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 30,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    color: '#888',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  googleButton: {
    borderColor: '#db4437',
  },
  facebookButton: {
    borderColor: '#4267B2',
  },
  appleButton: {
    borderColor: '#000',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 12,
  },
});