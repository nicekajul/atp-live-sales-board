import { useEffect, useRef } from 'react'

export function useAutoScroll(dep) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let pos = 0, paused = false, hovering = false, timer = null, raf

    const tick = () => {
      if (!paused && !hovering && el.scrollHeight > el.clientHeight) {
        pos += 0.25
        const max = el.scrollHeight - el.clientHeight
        if (pos >= max) {
          pos = max
          paused = true
          timer = setTimeout(() => { pos = 0; el.scrollTop = 0; paused = false }, 1800)
        } else {
          el.scrollTop = pos
        }
      }
      raf = requestAnimationFrame(tick)
    }

    const onEnter = () => { hovering = true }
    const onLeave = () => { hovering = false; pos = el.scrollTop }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    const startTimer = setTimeout(() => { raf = requestAnimationFrame(tick) }, 1000)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      clearTimeout(startTimer)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [dep])
  return ref
}
