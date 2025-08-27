// Script to create sample queue data for testing
const admin = require('firebase-admin')

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'kidqueue-app'
  })
}

const db = admin.firestore()

async function createSampleQueueData() {
  try {
    console.log('Creating sample queue data...')
    
    const batch = db.batch()
    
    // Create sample students
    const students = [
      { id: 'sample-student-1', name: 'Emma Wilson', grade: '3rd', parentId: 'sample-parent-1', schoolId: 'default-school' },
      { id: 'sample-student-2', name: 'Liam Johnson', grade: '4th', parentId: 'sample-parent-2', schoolId: 'default-school' },
      { id: 'sample-student-3', name: 'Sophia Davis', grade: '2nd', parentId: 'sample-parent-3', schoolId: 'default-school' },
      { id: 'sample-student-4', name: 'Noah Miller', grade: '5th', parentId: 'sample-parent-4', schoolId: 'default-school' }
    ]
    
    // Create sample vehicles  
    const vehicles = [
      { id: 'sample-vehicle-1', licensePlate: 'XYZ123', make: 'Honda', model: 'CR-V', color: 'Blue', parentId: 'sample-parent-1' },
      { id: 'sample-vehicle-2', licensePlate: 'ABC789', make: 'Toyota', model: 'Sienna', color: 'Silver', parentId: 'sample-parent-2' },
      { id: 'sample-vehicle-3', licensePlate: 'DEF456', make: 'Ford', model: 'Explorer', color: 'Black', parentId: 'sample-parent-3' },
      { id: 'sample-vehicle-4', licensePlate: 'GHI012', make: 'Chevrolet', model: 'Tahoe', color: 'White', parentId: 'sample-parent-4' }
    ]
    
    // Create sample parents (users)
    const parents = [
      { id: 'sample-parent-1', name: 'Sarah Wilson', email: 'sarah@example.com', schoolId: 'default-school' },
      { id: 'sample-parent-2', name: 'Mike Johnson', email: 'mike@example.com', schoolId: 'default-school' },
      { id: 'sample-parent-3', name: 'Lisa Davis', email: 'lisa@example.com', schoolId: 'default-school' },
      { id: 'sample-parent-4', name: 'Tom Miller', email: 'tom@example.com', schoolId: 'default-school' }
    ]
    
    // Add students to batch
    students.forEach(student => {
      batch.set(db.collection('students').doc(student.id), {
        ...student,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    })
    
    // Add vehicles to batch
    vehicles.forEach(vehicle => {
      batch.set(db.collection('vehicles').doc(vehicle.id), {
        ...vehicle,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    })
    
    // Add parents to batch
    parents.forEach(parent => {
      batch.set(db.collection('users').doc(parent.id), {
        ...parent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    })
    
    // Create queue entries
    const queueEntries = [
      {
        studentId: 'sample-student-1',
        parentId: 'sample-parent-1', 
        schoolId: 'default-school',
        vehicleId: 'sample-vehicle-1',
        status: 'waiting',
        queuePosition: 1,
        enteredAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        studentId: 'sample-student-2',
        parentId: 'sample-parent-2',
        schoolId: 'default-school', 
        vehicleId: 'sample-vehicle-2',
        status: 'waiting',
        queuePosition: 2,
        enteredAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        studentId: 'sample-student-3',
        parentId: 'sample-parent-3',
        schoolId: 'default-school',
        vehicleId: 'sample-vehicle-3', 
        status: 'called',
        queuePosition: 3,
        enteredAt: admin.firestore.FieldValue.serverTimestamp(),
        calledAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        studentId: 'sample-student-4',
        parentId: 'sample-parent-4',
        schoolId: 'default-school',
        vehicleId: 'sample-vehicle-4',
        status: 'waiting', 
        queuePosition: 4,
        enteredAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ]
    
    // Add queue entries to batch
    queueEntries.forEach(entry => {
      batch.set(db.collection('queue').doc(), entry)
    })
    
    // Commit the batch
    await batch.commit()
    
    console.log('✅ Sample queue data created successfully!')
    console.log('📊 Created:', students.length, 'students,', vehicles.length, 'vehicles,', parents.length, 'parents,', queueEntries.length, 'queue entries')
    console.log('🔗 Kiosk URL: https://kidqueue-app.web.app/kiosk')
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error)
  } finally {
    process.exit(0)
  }
}

createSampleQueueData()