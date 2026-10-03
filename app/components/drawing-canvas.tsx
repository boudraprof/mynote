"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser, RotateCcw, Save } from 'lucide-react'
import { Button } from './ui/button'

type Props = {
  onSave: (dataUrl: string) => void
  onClose: () => void
}

const COLORS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]
const BRUSH_SIZES = [2, 4, 6, 10]

export default function DrawingCanvas({ onSave, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [isEraser, setIsEraser] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.min(rect.width, 800)
    canvas.height = Math.min(rect.height, 600)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return { x: 0, y: 0 }
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    lastPos.current = getPos(e)
  }, [])

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawing) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx || !lastPos.current) return

      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = isEraser ? '#ffffff' : color
      ctx.lineWidth = isEraser ? brushSize * 4 : brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      lastPos.current = pos
    },
    [isDrawing, color, brushSize, isEraser],
  )

  const stopDraw = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const save = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL('image/png'))
  }, [onSave])

  return (
    <div
      data-slot="dialog-content"
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
    >
      <div className="bg-background rounded-xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[90vh]">
        <div className="flex items-center gap-2 p-3 border-b flex-wrap">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c)
                  setIsEraser(false)
                }}
                className={`size-6 rounded-full border-2 transition-all ${
                  color === c && !isEraser
                    ? 'border-foreground scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="w-px h-6 bg-border mx-2" />
          <div className="flex gap-1">
            {BRUSH_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBrushSize(s)}
                className={`size-6 rounded-full flex items-center justify-center border ${
                  brushSize === s && !isEraser
                    ? 'border-foreground bg-accent'
                    : 'border-border'
                }`}
              >
                <div
                  className="rounded-full bg-foreground"
                  style={{ width: s + 2, height: s + 2 }}
                />
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-border mx-2" />
          <Button
            type="button"
            variant={isEraser ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setIsEraser(!isEraser)}
            title="Eraser"
          >
            <Eraser size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clear}
            title="Clear"
          >
            <RotateCcw size={16} />
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            <Save size={16} className="mr-1" />
            Save
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full aspect-[4/3] rounded-b-xl cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
    </div>
  )
}
