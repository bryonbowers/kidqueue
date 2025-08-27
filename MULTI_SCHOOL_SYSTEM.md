# 🏫 KidQueue Multi-School System

## Overview
Complete multi-school support system allowing users to manage multiple schools, each with their own pickup queues, settings, and permissions.

## 🎯 Key Features

### **School Management**
- **Create Schools**: Users can create new schools with custom settings
- **School Switching**: Dynamic school switching with persistent selection
- **Role-Based Access**: Admin, Teacher, and Parent roles per school
- **School Settings**: Customizable pickup times, rules, and notifications

### **Queue Isolation**
- **School-Specific Queues**: Each school maintains its own pickup queue
- **Cross-School Data Separation**: Students, vehicles, and queues are properly isolated
- **Real-Time Updates**: Queue updates specific to current school only

### **User Permissions**
- **Multi-Role Support**: Users can be admins at one school, teachers at another
- **Permission Inheritance**: Role-based permissions automatically applied
- **School Invitations**: Invite users to schools with specific roles

## 🏗️ Architecture

### **Data Structure**
```
Schools Collection:
{
  id: string
  name: string
  address: string
  adminIds: string[]     // Users who can manage school
  teacherIds: string[]   // Users who can manage queues
  active: boolean
  settings: {
    allowParentQRManagement: boolean
    requireVehicleAssociation: boolean
    maxStudentsPerVehicle: number
    queueAutoReset: boolean
    notificationsEnabled: boolean
  }
  timezone: string
  pickupStartTime: string  // "14:30"
  pickupEndTime: string    // "16:00"
}

Students Collection:
{
  parentId: string
  schoolId: string      // Links student to specific school
  name: string
  grade: string
  qrCode: string
}

Queue Collection:
{
  studentId: string
  parentId: string
  schoolId: string      // Ensures queue isolation per school
  vehicleId: string
  status: 'waiting' | 'called' | 'picked_up'
  queuePosition: number
}
```

### **Context Architecture**
```
SchoolProvider
├── School Selection State
├── Available Schools Management  
├── Permission Calculations
├── Current School Context
└── School Switching Logic

useSchoolFirebase Hook
├── School-Aware CRUD Operations
├── Queue Management per School
├── Data Filtering by Current School
└── Permission-Based Access Control
```

## 🔧 Technical Implementation

### **Key Components**

#### **SchoolContext**
- Manages current school selection
- Loads user's available schools
- Handles school switching
- Calculates user permissions per school
- Provides school-aware data filtering

#### **SchoolSelector Component**
- Multi-variant selector (button, chip, minimal)
- School creation dialog
- Role display and management
- Public schools discovery
- Persistent school selection

#### **useSchoolFirebase Hook**
- School-aware Firebase operations
- Automatic data filtering by current school
- Queue operations scoped to current school
- Permission-based function access

### **School Auto-Creation**
- **New Parents**: Automatically get a default school
- **Teachers/Admins**: Must be invited to schools
- **School Naming**: Defaults to "{UserName}'s School"
- **Settings**: Sensible defaults for new schools

### **Permission System**
```typescript
Roles per School:
- Admin: Full school management, user invites, settings
- Teacher: Queue management, student check-in/out  
- Parent: Add students/vehicles, join queues
```

## 🎮 User Experience Flow

### **First-Time User**
1. **Sign Up** → Creates user profile
2. **Parent Role** → Auto-creates default school
3. **School Selection** → Auto-selects their school
4. **Add Students** → Students linked to current school
5. **Queue Management** → School-specific queue operations

### **Multi-School User**
1. **School Selector** → Choose active school from dropdown
2. **Context Switch** → All data automatically filters to selected school
3. **Role Display** → Shows user's role at current school
4. **Permission UI** → Features enabled/disabled based on role

### **School Admin Workflow**
1. **Create School** → Set up new school with settings
2. **Invite Teachers** → Send email invitations with teacher role
3. **Manage Settings** → Configure pickup rules and times
4. **Monitor Queues** → View and manage school-specific queues

## 📊 Analytics Integration

### **School-Specific Metrics**
- **School Creation**: Track when users create new schools
- **School Switching**: Monitor how users navigate between schools
- **Multi-School Usage**: Identify power users managing multiple schools
- **Role Distribution**: Track admin/teacher/parent ratios per school

### **Enhanced User Properties**
```typescript
User Analytics Properties:
- current_school_id: Active school identifier
- current_school_role: User's role at current school  
- current_school_name: School name for segmentation
- total_schools_count: Number of schools user belongs to
```

### **Queue Analytics by School**
- Queue joins segmented by school
- Peak usage times per school
- Queue efficiency metrics per school
- User engagement patterns by school type

## 🔒 Security & Privacy

### **Data Isolation**
- **School Boundaries**: Strict data separation between schools
- **Permission Checks**: All operations validate user permissions
- **Query Filtering**: Automatic school-based data filtering

### **Access Control**
- **Role Validation**: Server-side permission verification
- **School Membership**: Users can only access schools they belong to
- **Invite System**: Controlled access to schools via invitations

### **Privacy Protection**
- **School Names**: Limited to 20 characters in analytics
- **User Data**: No cross-school data leakage
- **Audit Trail**: Track school access and modifications

## 🚀 Deployment Status

### **Live Features**
- ✅ **Multi-School Creation** and management
- ✅ **Dynamic School Switching** with UI
- ✅ **Role-Based Permissions** per school
- ✅ **School-Specific Queues** with isolation
- ✅ **Real-Time Updates** scoped to current school
- ✅ **Analytics Integration** with school tracking
- ✅ **Mobile-Responsive** school selector UI

### **Production URL**
🌐 **https://kidqueue-app.web.app**

### **School Management UI Locations**
- **Header**: Minimal school selector with current school
- **Dashboard**: Full school selector with role display
- **Navigation**: School context maintained across all pages

## 🔄 Migration Path

### **Existing Users**
- **Legacy schoolId**: Maintained for backwards compatibility
- **Auto-Migration**: Single school users automatically converted
- **Data Preservation**: All existing data preserved during migration

### **New Users**
- **Modern Multi-School**: Full multi-school experience from start
- **Progressive Disclosure**: Simple single school → advanced multi-school
- **Onboarding Flow**: Guided school setup for new users

## 📈 Business Impact

### **Value Propositions**
1. **Scalability**: Support schools of any size with multiple locations
2. **Flexibility**: Users can manage children across different schools
3. **Isolation**: Each school's data and queues remain separate
4. **Efficiency**: Role-based access reduces cognitive overhead
5. **Growth**: Easy expansion to new schools and districts

### **Key Success Metrics**
- **Schools Created**: Number of new schools added
- **Multi-School Adoption**: Users managing 2+ schools
- **Cross-School Activity**: Users switching between schools
- **Admin Engagement**: School management feature usage
- **Queue Efficiency**: Per-school pickup time improvements

---

## 🛠️ Developer Notes

### **Adding New School Features**
1. **Context First**: Add to SchoolContext for global access
2. **Permission Check**: Validate user role before operations
3. **Data Scoping**: Always filter by currentSchool.id
4. **Analytics**: Track school-specific events
5. **UI Consistency**: Use SchoolSelector component patterns

### **Testing Multi-School Features**
- Create multiple test schools
- Switch between schools to verify data isolation
- Test different user roles per school
- Verify permission-based UI changes
- Check analytics segmentation by school

The multi-school system is now fully operational with comprehensive school management, queue isolation, and role-based permissions! 🎉