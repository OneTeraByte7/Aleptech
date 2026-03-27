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
