import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/sheets.js'

const POLL_MS = 10_000

export function useBoard() {
  const [board,       setBoard]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.getBoard()
      if (res.success) {
        setBoard(res.data)
        setLastUpdated(new Date())
        setError(null)
      } else {
        setError(res.error || 'Failed to load board')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBoard()
    intervalRef.current = setInterval(fetchBoard, POLL_MS)
    return () => clearInterval(intervalRef.current)
  }, [fetchBoard])

  return { board, loading, error, lastUpdated, refetch: fetchBoard }
}

export function useSecondsSince(date) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!date) return
    const tick = () => setSeconds(Math.floor((Date.now() - date.getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [date])
  return seconds
}
