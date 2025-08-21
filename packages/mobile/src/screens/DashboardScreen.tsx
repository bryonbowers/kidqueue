import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Card, FAB } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Text style={styles.welcomeText}>Welcome back, {user?.name}!</Text>
            <Text style={styles.roleText}>
              {isTeacher ? 'Teacher Dashboard' : 'Parent Dashboard'}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.cardGrid}>
          <Card style={styles.actionCard} onPress={() => navigation.navigate('Students')}>
            <Card.Content>
              <Text style={styles.cardTitle}>My Students</Text>
              <Text style={styles.cardDescription}>
                Manage your students and view their QR codes
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.actionCard} onPress={() => navigation.navigate('Queue')}>
            <Card.Content>
              <Text style={styles.cardTitle}>Queue Status</Text>
              <Text style={styles.cardDescription}>
                Check current pickup queue status
              </Text>
            </Card.Content>
          </Card>

          {isTeacher && (
            <Card style={styles.actionCard} onPress={() => navigation.navigate('QRScanner')}>
              <Card.Content>
                <Text style={styles.cardTitle}>Scan QR Code</Text>
                <Text style={styles.cardDescription}>
                  Scan student or vehicle QR codes to manage queue
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              {isTeacher 
                ? '1. Use the QR scanner to scan parent vehicle stickers or student QR codes\n2. Students are automatically added to the pickup queue\n3. Scan again to mark students as called or picked up'
                : '1. Add your students and vehicles in the app\n2. Print QR code stickers for your vehicles\n3. Teachers scan your QR code to add students to pickup queue\n4. Get notified when your student is called for pickup'
              }
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.logoutContainer}>
          <Button mode="outlined" onPress={logout} style={styles.logoutButton}>
            Sign Out
          </Button>
        </View>
      </ScrollView>

      {isTeacher && (
        <FAB
          icon="qrcode-scan"
          style={styles.fab}
          onPress={() => navigation.navigate('QRScanner')}
          label="Scan QR"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 16,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: '#666',
  },
  cardGrid: {
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  logoutContainer: {
    marginTop: 20,
    marginBottom: 100,
  },
  logoutButton: {
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});