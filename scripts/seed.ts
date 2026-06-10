import { config } from 'dotenv'
config({ path: '.env.local' })
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dopa-mentor-portal'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env.local')
  process.exit(1)
}

async function main() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  const User = (await import('../models/User')).default

  console.log('Clearing all users...')
  await User.deleteMany({})

  console.log('Creating admin user...')
  await User.create({
    name: 'DOPA Admin',
    username: ADMIN_USERNAME!.toLowerCase().trim(),
    password: await bcrypt.hash(ADMIN_PASSWORD!, 10),
    role: 'admin',
    isActive: true,
    region: null,
    campus: null,
    createdBy: new mongoose.Types.ObjectId(),
  })

  console.log('\n✅ Seed completed!')
  console.log(`  Admin: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`)

  await mongoose.disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
