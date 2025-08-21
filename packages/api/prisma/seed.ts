import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample school
  const school = await prisma.school.create({
    data: {
      name: 'Sunny Elementary School',
      address: '123 Main Street, Anytown, USA',
      phoneNumber: '(555) 123-4567',
    },
  })

  console.log('🏫 Created sample school:', school.name)

  // Create sample admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@sunnyschool.edu',
      name: 'School Administrator',
      provider: 'google',
      providerId: 'admin_123',
      role: 'admin',
      schoolId: school.id,
    },
  })

  console.log('👨‍💼 Created admin user:', adminUser.email)

  // Create sample teacher
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@sunnyschool.edu',
      name: 'Ms. Johnson',
      provider: 'google',
      providerId: 'teacher_123',
      role: 'teacher',
      schoolId: school.id,
    },
  })

  console.log('👩‍🏫 Created teacher:', teacher.email)

  console.log('✅ Database seeding completed!')
  console.log('\n📋 Sample accounts created:')
  console.log(`  Admin: ${adminUser.email}`)
  console.log(`  Teacher: ${teacher.email}`)
  console.log('\n🔗 School ID for testing:', school.id)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })