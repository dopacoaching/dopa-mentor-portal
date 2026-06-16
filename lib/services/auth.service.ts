import type { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { signJWT } from '@/lib/auth'
import User from '@/models/User'
import { logAudit } from '@/lib/audit'
import { ApiError } from '@/lib/api/errors'

export interface LoginResult {
  token: string
  user: { userId: string; role: string; name: string; username: string }
}

/** Validates credentials and returns a signed token + public user fields. */
export async function login(
  username: unknown,
  password: unknown,
  request?: NextRequest
): Promise<LoginResult> {
  if (!username || !password) {
    throw ApiError.badRequest('Username and password are required')
  }

  await connectDB()

  const user = await User.findOne({ username: String(username).toLowerCase().trim() })
  if (!user) throw ApiError.unauthorized('Invalid credentials')

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact admin.')
  }

  const isValid = await bcrypt.compare(String(password), user.password)
  if (!isValid) throw ApiError.unauthorized('Invalid credentials')

  const token = signJWT({ userId: user._id.toString(), role: user.role })

  logAudit({
    user: { userId: user._id.toString(), role: user.role },
    userName: user.name,
    action: 'user.login',
    details: { username: user.username },
    request,
  })

  return {
    token,
    user: {
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      username: user.username,
    },
  }
}

/** Returns the current user (without password) or throws 404. */
export async function getCurrentUser(userId: string) {
  await connectDB()
  const user = await User.findById(userId).select('-password')
  if (!user) throw ApiError.notFound('User not found')
  return user
}
