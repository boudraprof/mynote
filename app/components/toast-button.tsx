import type {
  MouseEventHandler,
} from 'react'

export default function ({
  title,
  btnTitle,
  onClick
}: {
  title: string
  btnTitle?: string
  onClick:  MouseEventHandler<HTMLButtonElement> | undefined
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{title}</span>
      <button
        onClick={onClick}
        className="ml-2 px-3 py-1 bg-white text-gray-800 rounded hover:bg-gray-100 transition-colors font-medium text-sm"
      >
        {btnTitle ?? 'Undo'}
      </button>
    </div>
  )
}
