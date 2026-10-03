/**
 * Collaborative editing utilities
 * Real-time sync using WebSocket or polling
 */

import api from '@/utils/axios'
import logger from '@/utils/logger'

interface Collaborator {
  id: string
  name: string
  color: string
  cursor?: {
    position: number
    selection?: { start: number; end: number }
  }
}

interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor' | 'edit' | 'presence'
  userId: string
  noteId: string
  data?: unknown
  timestamp: number
}

type CollaborationCallback = (event: CollaborationEvent) => void

// Predefined colors for collaborators
const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#82E0AA', '#F8C471',
]

class CollaborationManager {
  private noteId: string | null = null
  private userId: string | null = null
  private collaborators: Map<string, Collaborator> = new Map()
  private listeners: Set<CollaborationCallback> = new Set()
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private lastSync = 0

  /**
   * Start collaborating on a note
   */
  async join(noteId: string, userId: string): Promise<void> {
    this.noteId = noteId
    this.userId = userId

    // Announce presence
    await this.sendPresence('join')

    // Start polling for updates
    this.startPolling()

    logger.info(`Joined collaboration on note ${noteId}`, 'Collaboration')
  }

  /**
   * Stop collaborating
   */
  async leave(): Promise<void> {
    if (this.noteId) {
      await this.sendPresence('leave')
    }

    this.stopPolling()
    this.noteId = null
    this.userId = null
    this.collaborators.clear()

    logger.info('Left collaboration', 'Collaboration')
  }

  /**
   * Update cursor position
   */
  async updateCursor(position: number, selection?: { start: number; end: number }): Promise<void> {
    if (!this.noteId || !this.userId) return

    const event: CollaborationEvent = {
      type: 'cursor',
      userId: this.userId,
      noteId: this.noteId,
      data: { position, selection },
      timestamp: Date.now(),
    }

    await this.broadcastEvent(event)
  }

  /**
   * Notify collaborators of content change
   */
  async notifyEdit(operation: { type: string; position: number; length?: number }): Promise<void> {
    if (!this.noteId || !this.userId) return

    const event: CollaborationEvent = {
      type: 'edit',
      userId: this.userId,
      noteId: this.noteId,
      data: operation,
      timestamp: Date.now(),
    }

    await this.broadcastEvent(event)
  }

  /**
   * Subscribe to collaboration events
   */
  subscribe(callback: CollaborationCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  /**
   * Get current collaborators
   */
  getCollaborators(): Array<Collaborator> {
    return Array.from(this.collaborators.values()).filter(
      (c) => c.id !== this.userId
    )
  }

  /**
   * Get color for a collaborator
   */
  getCollaboratorColor(userId: string): string {
    const existing = this.collaborators.get(userId)
    if (existing) return existing.color

    // Assign color based on userId hash
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return COLLABORATOR_COLORS[hash % COLLABORATOR_COLORS.length]!
  }

  private async sendPresence(type: 'join' | 'leave'): Promise<void> {
    if (!this.noteId || !this.userId) return

    const event: CollaborationEvent = {
      type,
      userId: this.userId,
      noteId: this.noteId,
      timestamp: Date.now(),
    }

    await this.broadcastEvent(event)
  }

  private async broadcastEvent(event: CollaborationEvent): Promise<void> {
    try {
      // Use polling-based sync for now
      // In production, replace with WebSocket
      await api.post(`/notes/${event.noteId}/collaboration`, event)
    } catch {
      // Silently fail - collaboration is optional
    }
  }

  private startPolling(): void {
    this.stopPolling()

    // Poll every 2 seconds
    this.pollInterval = setInterval(() => {
      void this.fetchUpdates()
    }, 2000)
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private async fetchUpdates(): Promise<void> {
    if (!this.noteId) return

    try {
      const { data } = await api.get(`/notes/${this.noteId}/collaboration`, {
        params: { since: this.lastSync },
      })

      if (data.events) {
        for (const event of data.events) {
          if (event.userId !== this.userId) {
            this.handleEvent(event)
          }
        }
        this.lastSync = Date.now()
      }
    } catch {
      // Silently fail
    }
  }

  private handleEvent(event: CollaborationEvent): void {
    switch (event.type) {
      case 'join':
        this.collaborators.set(event.userId, {
          id: event.userId,
          name: (event.data as { name: string }).name || 'Anonymous',
          color: this.getCollaboratorColor(event.userId),
        })
        break

      case 'leave':
        this.collaborators.delete(event.userId)
        break

      case 'cursor': {
        const collaborator = this.collaborators.get(event.userId)
        if (collaborator) {
          collaborator.cursor = event.data as Collaborator['cursor']
        }
        break
      }
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}

// Singleton instance
export const collaboration = new CollaborationManager()

/**
 * Hook-friendly collaboration utilities
 */
export const collaborationUtils = {
  /**
   * Generate a random user ID for anonymous collaboration
   */
  generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  },

  /**
   * Get a display name for a user ID
   */
  getDisplayName(userId: string): string {
    // Could integrate with user service
    return userId.slice(0, 8)
  },

  /**
   * Check if real-time collaboration is supported
   */
  isSupported(): boolean {
    return typeof EventSource !== 'undefined' || typeof WebSocket !== 'undefined'
  },
}
