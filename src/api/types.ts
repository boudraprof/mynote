export interface ApiNote {
  id: string
  userId: string
  statusId: string
  title: string | null
  content: string | null
  image: string | null
  labels: string[]
  pinned: boolean
  position: number
  checklist: boolean
  checklistItems: string | null
  palette: string | null
  createdAt: string
  updatedAt: string
  StatusName?: string
  reminderAt?: string | null
}

export interface ApiResponse<T> {
  data: T
  total: number
  limit: number
  offset: number
}

export interface ApiResult {
  error: boolean
  message: string
}

export interface UploadResult {
  success: boolean
  url?: string
  filename?: string
  size?: number
  mime?: string
  errors?: string
  message?: string
}
