"use client"
import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RateLimitToastProps {
  retryAfter: number // seconds
  onClose: () => void
  message?: string
}

export function RateLimitToast({
  retryAfter,
  onClose,
  message = 'Too many requests. Please wait before trying again.',
}: RateLimitToastProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter)

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onClose])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try again in {formatTime(timeLeft)}
        </p>
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-destructive transition-all duration-1000"
            style={{ width: `${(timeLeft / retryAfter) * 100}%` }}
          />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Hook to detect and handle rate limiting from API responses
 */
export function useRateLimitHandler() {
  const [rateLimit, setRateLimit] = useState<{
    retryAfter: number
    message: string
  } | null>(null)

  const handleRateLimit = (error: unknown) => {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response &&
      error.response.status === 429
    ) {
      const response = error.response as { headers?: Record<string, string> }
      const retryAfter = parseInt(response.headers?.['retry-after'] || '60', 10)
      setRateLimit({
        retryAfter,
        message: response.headers?.['x-ratelimit-message'] || 'Too many requests',
      })
      return true
    }
    return false
  }

  const clearRateLimit = () => setRateLimit(null)

  return {
    rateLimit,
    handleRateLimit,
    clearRateLimit,
  }
}
