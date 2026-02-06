import { useState, useEffect, useCallback } from "react"

const PREFIX = "kingscollege_backoffice_"

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = "__localStorage_test__"
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

// Generic persisted state hook
export function usePersistedState<T>(key: string, defaultValue: T) {
  const storageKey = PREFIX + key
  const localStorageAvailable = isLocalStorageAvailable()

  // Initialize state
  const [state, setState] = useState<T>(() => {
    if (!localStorageAvailable) {
      return defaultValue
    }

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === null) {
        return defaultValue
      }
      const parsed = JSON.parse(stored)
      return parsed
    } catch (error) {
      console.warn(`Failed to load persisted state for key "${key}":`, error)
      return defaultValue
    }
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!localStorageAvailable) {
      return
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
      // Note: StorageEvent is automatically dispatched by browser for cross-tab sync
      // Manual dispatch causes infinite loop, so we don't dispatch it here
    } catch (error) {
      console.warn(`Failed to save persisted state for key "${key}":`, error)
      // Continue using memory state if localStorage fails
    }
  }, [state, storageKey, localStorageAvailable, key])

  // Listen for cross-tab changes
  useEffect(() => {
    if (!localStorageAvailable) {
      return
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue)
          setState(parsed)
        } catch (error) {
          console.warn(`Failed to sync persisted state for key "${key}":`, error)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [storageKey, localStorageAvailable, key])

  // Clear function
  const clearState = useCallback(() => {
    setState(defaultValue)
    if (localStorageAvailable) {
      try {
        localStorage.removeItem(storageKey)
      } catch (error) {
        console.warn(`Failed to clear persisted state for key "${key}":`, error)
      }
    }
  }, [defaultValue, storageKey, localStorageAvailable, key])

  return [state, setState, clearState] as const
}
