const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const body = await res.json()
  if (!res.ok) throw { status: res.status, detail: body.detail ?? body }
  return body
}

// Flights
export const getFlights = (params = {}) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, v))
  return request(`/flights?${qs}`)
}

export const getFlight = (id) => request(`/flights/${id}`)

export const reassignFlight = (flightId, targetStandId) =>
  request(`/flights/${flightId}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ target_stand_id: targetStandId }),
  })

// Stands
export const getStands = (params = {}) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, v))
  return request(`/stands?${qs}`)
}

export const getStandSchedule = (standId) => request(`/stands/${standId}/schedule`)

// Gates
export const getGates = (params = {}) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && qs.set(k, v))
  return request(`/gates?${qs}`)
}

export const getGate = (id) => request(`/gates/${id}`)

// Graph data
export const getGraphData = () => request('/graph')

// Metrics
export const getMetrics = () => request('/metrics')

// Chat
export const getChatHistory = () => request('/chat/history')

// Simulate AI chat response
export const sendChatMessage = async (message) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
  
  // Mock AI response based on the message content
  const responses = {
    'show me all delayed flights': 'I found 2 delayed flights: QR501 (Qatar Airways, delayed by 25 minutes) and AF218 (Air France, delayed by 15 minutes). Both are in Terminal T1 and T2 respectively.',
    'what\'s the current stand utilization?': 'Current stand utilization is 70% across all terminals. T1: 4/5 stands occupied (80%), T2: 3/5 stands occupied (60%). PLB usage is at 71% of target 85%.',
    'which flights arrive in the next hour?': 'Looking at the next hour, I see 2 arriving flights: QR501 at A1-01 (delayed ETA 10:40) and CX888 at B1-01 (early ETA 09:50).',
    'reassign ek512 to a plb stand': 'EK512 is currently at A1-03 which already has PLB. However, if you need alternatives, A1-01 and B1-01 are also PLB-enabled stands that can accommodate B777-300ER aircraft.',
    'show t1 capacity forecast': 'Terminal 1 forecast: Currently 80% utilized (4/5 stands). Peak usage expected 11:30-14:00 when LH752 overlaps with existing assignments. A1-05 (remote) remains available as backup.'
  }
  
  const key = message.toLowerCase().trim()
  const response = responses[key] || `I understand you're asking about "${message}". Based on current operations data, I'd recommend checking the Timeline view for visual flight assignments or the Stands view for detailed occupancy status.`
  
  return {
    content: response,
    timestamp: new Date().toISOString()
  }
}
