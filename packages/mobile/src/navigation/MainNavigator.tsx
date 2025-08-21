import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/DashboardScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import StudentsScreen from '../screens/StudentsScreen';
import QueueScreen from '../screens/QueueScreen';
import { useAuth } from '../contexts/AuthContext';

const Stack = createStackNavigator();

export default function MainNavigator() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'KidQueue' }}
      />
      <Stack.Screen 
        name="Students" 
        component={StudentsScreen}
        options={{ title: 'My Students' }}
      />
      <Stack.Screen 
        name="Queue" 
        component={QueueScreen}
        options={{ title: 'Queue Status' }}
      />
      {isTeacher && (
        <Stack.Screen 
          name="QRScanner" 
          component={QRScannerScreen}
          options={{ title: 'Scan QR Code' }}
        />
      )}
    </Stack.Navigator>
  );
}