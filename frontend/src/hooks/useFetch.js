import { useState, useEffect, useCallback } from 'react'

/**
 * Generic data-fetching hook.
 * @param {() => Promise<any>} fetcher  – async function returning data
 * @param {any[]} deps                  – dependency array (re-fetches when changed)
 */
export function useFetch(fetcher, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
