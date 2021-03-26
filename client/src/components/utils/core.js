import { useState, useEffect } from 'react'

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[-]+/g, '-')
    .replace(/[^\w-]+/g, '')

const stringToJSON = (text) => {
  if (typeof text === 'string') {
    try {
      return JSON.parse(text)
    } catch (e) {
      return false
    }
  }
  return text
}

const useOutsideClick = (ref, callback) => {
  const handleClick = (e) => {
    if (!ref.current || ref.current.contains(e.target)) return
    callback(e)
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClick, false)

    return () => {
      document.removeEventListener('mousedown', handleClick, false)
    }
  })
}

const useDebounce = (value, delay, { isReady = true }) => {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(
    () => {
      // ignore if value isn't ready yet (like loading)
      if (!isReady) return null

      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value)
      }, delay)

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler)
      }
    },
    [value, delay] // Only re-call effect if value or delay changes
  )

  return debouncedValue
}

export { slugify, stringToJSON, useOutsideClick, useDebounce }
