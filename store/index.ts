import { configureStore, combineReducers } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import authReducer from './slices/authSlice'
import notificationReducer from './slices/notificationSlice'
import uiReducer from './slices/uiSlice'

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['userId', 'role', 'name', 'username', 'isAuthenticated'],
}

const notificationPersistConfig = {
  key: 'notification',
  storage,
  whitelist: ['unreadCount'],
}

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  notification: persistReducer(notificationPersistConfig, notificationReducer),
  ui: uiReducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
