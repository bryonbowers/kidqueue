import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';

export default function QueueScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  
  // This would be connected to your API in a real implementation
  const queueEntries = [
    {
      id: '1',
      student: { name: 'John Doe' },
      school: { name: 'Elementary School' },
      status: 'waiting',
      queuePosition: 3,
      enteredAt: new Date().toISOString(),
    },
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderQueueEntry = ({ item }: { item: any }) => (
    <Card style={styles.queueCard}>
      <Card.Content>
        <View style={styles.entryHeader}>
          <Text style={styles.studentName}>{item.student.name}</Text>
          <Chip 
            mode="outlined"
            style={[
              styles.statusChip,
              item.status === 'waiting' ? styles.waitingChip : styles.calledChip
            ]}
          >
            {item.status === 'waiting' ? 'Waiting' : 'Called'}
          </Chip>
        </View>
        <Text style={styles.schoolName}>{item.school.name}</Text>
        <Text style={styles.positionText}>
          Position {item.queuePosition} in queue
        </Text>
        <Text style={styles.timeText}>
          Entered at {new Date(item.enteredAt).toLocaleTimeString()}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {queueEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No students in queue</Text>
          <Text style={styles.emptySubtext}>
            Your students will appear here when added to pickup queue
          </Text>
          <Button mode="outlined" onPress={onRefresh} style={styles.refreshButton}>
            Refresh
          </Button>
        </View>
      ) : (
        <FlatList
          data={queueEntries}
          renderItem={renderQueueEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  list: {
    padding: 16,
  },
  queueCard: {
    marginBottom: 12,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 28,
  },
  waitingChip: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
  },
  calledChip: {
    backgroundColor: '#d1edff',
    borderColor: '#0dcaf0',
  },
  schoolName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  positionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1976d2',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
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
  refreshButton: {
    borderRadius: 8,
  },
});