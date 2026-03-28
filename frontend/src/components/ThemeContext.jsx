import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('aleph-theme')
    if (savedTheme !== null) {
      return savedTheme === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('aleph-theme', isDarkMode ? 'dark' : 'light')
    
    // Update CSS custom properties
    const root = document.documentElement
    
    if (isDarkMode) {
      // Dark mode colors
      root.style.setProperty('--bg-base', '#0f172a')
      root.style.setProperty('--bg-surface', '#1e293b')
      root.style.setProperty('--bg-raised', '#334155')
      root.style.setProperty('--bg-hover', '#475569')
      
      root.style.setProperty('--text', '#f1f5f9')
      root.style.setProperty('--text-primary', '#f1f5f9')
      root.style.setProperty('--text-secondary', '#cbd5e1')
      root.style.setProperty('--text-muted', '#94a3b8')
      
      root.style.setProperty('--border', '#334155')
      root.style.setProperty('--border-bright', '#475569')
      
      root.style.setProperty('--accent', '#38bdf8')
      root.style.setProperty('--accent-dim', 'rgba(56, 189, 248, 0.2)')
      
      root.style.setProperty('--green', '#10b981')
      root.style.setProperty('--green-dim', 'rgba(16, 185, 129, 0.2)')
      
      root.style.setProperty('--amber', '#f59e0b')
      root.style.setProperty('--amber-dim', 'rgba(245, 158, 11, 0.2)')
      
      root.style.setProperty('--rose', '#f43f5e')
      root.style.setProperty('--rose-dim', 'rgba(244, 63, 94, 0.2)')
      
      root.style.setProperty('--violet', '#8b5cf6')
      root.style.setProperty('--violet-dim', 'rgba(139, 92, 246, 0.2)')
    } else {
      // Light mode colors
      root.style.setProperty('--bg-base', '#ffffff')
      root.style.setProperty('--bg-surface', '#f8fafc')
      root.style.setProperty('--bg-raised', '#f1f5f9')
      root.style.setProperty('--bg-hover', '#e2e8f0')
      
      root.style.setProperty('--text', '#1e293b')
      root.style.setProperty('--text-primary', '#1e293b')
      root.style.setProperty('--text-secondary', '#475569')
      root.style.setProperty('--text-muted', '#64748b')
      
      root.style.setProperty('--border', '#e2e8f0')
      root.style.setProperty('--border-bright', '#cbd5e1')
      
      root.style.setProperty('--accent', '#0ea5e9')
      root.style.setProperty('--accent-dim', 'rgba(14, 165, 233, 0.1)')
      
      root.style.setProperty('--green', '#059669')
      root.style.setProperty('--green-dim', 'rgba(5, 150, 105, 0.1)')
      
      root.style.setProperty('--amber', '#d97706')
      root.style.setProperty('--amber-dim', 'rgba(217, 119, 6, 0.1)')
      
      root.style.setProperty('--rose', '#e11d48')
      root.style.setProperty('--rose-dim', 'rgba(225, 29, 72, 0.1)')
      
      root.style.setProperty('--violet', '#7c3aed')
      root.style.setProperty('--violet-dim', 'rgba(124, 58, 237, 0.1)')
    }
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}