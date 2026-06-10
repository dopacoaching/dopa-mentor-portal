import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, Role } from '@/types'

const initialState: AuthState = {
  userId: null,
  role: null,
  name: null,
  username: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(
      state,
      action: PayloadAction<{ userId: string; role: Role; name: string; username: string }>
    ) {
      state.userId = action.payload.userId
      state.role = action.payload.role
      state.name = action.payload.name
      state.username = action.payload.username
      state.isAuthenticated = true
    },
    clearAuth(state) {
      state.userId = null
      state.role = null
      state.name = null
      state.username = null
      state.isAuthenticated = false
    },
  },
})

export const { setAuth, clearAuth } = authSlice.actions
export default authSlice.reducer
