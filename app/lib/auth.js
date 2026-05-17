export function getSession() {
  if (typeof window === 'undefined') return null
  const session = localStorage.getItem('session')
  return session ? JSON.parse(session) : null
}

export function setSession(user) {
  localStorage.setItem('session', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('session')
}