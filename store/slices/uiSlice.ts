import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { UIState } from '@/types'

const initialState: UIState = {
  sidebarOpen: true,
  isLoading: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
  },
})

export const { toggleSidebar, setSidebarOpen, setLoading } = uiSlice.actions
export default uiSlice.reducer
