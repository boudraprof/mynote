import { atom } from 'jotai'

export const search = atom('')
export const spinner = atom(false)
export const listViewMode = atom<'grid' | 'list'>('grid')
