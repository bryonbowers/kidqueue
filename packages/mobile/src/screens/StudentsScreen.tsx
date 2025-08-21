import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Button, FAB } from 'react-native-paper';

export default function StudentsScreen() {
  // This would be connected to your API in a real implementation
  const students = [
    { id: '1', name: 'John Doe', grade: '3rd', school: 'Elementary School' },
    { id: '2', name: 'Jane Doe', grade: '5th', school: 'Elementary School' },
  ];

  const renderStudent = ({ item }: { item: any }) => (
    <Card style={styles.studentCard}>
      <Card.Content>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentInfo}>Grade {item.grade} • {item.school}</Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => {}}>View QR Code</Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No students added yet</Text>
          <Text style={styles.emptySubtext}>
            Add your students to manage pickup queue
          </Text>
          <Button mode="contained" onPress={() => {}} style={styles.addButton}>
            Add Student
          </Button>
        </View>
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
      
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
        label="Add Student"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  studentCard: {
    marginBottom: 12,
    elevation: 2,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  studentInfo: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});