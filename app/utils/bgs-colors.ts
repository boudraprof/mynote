import type { NoteStatusType } from "@/types"

export const THEME_COLORS = {
  light: '#f9fafb', // Tailwind gray-50
  dark: '#101828', // Tailwind gray-900
} as const


export const notesPaletteColors = [
  'coral',
  'peach',
  'sand',
  'mint',
  'sage',
  'fog',
  'storm',
  'dusk',
  'blossom',
  'clay',
  'chalk',
] 

export const paletteColorValues: Record<string, string> = {
  coral: '#f4a460',
  peach: '#ffdab9',
  sand: '#f5deb3',
  mint: '#98fb98',
  sage: '#bcb88a',
  fog: '#dcdcdc',
  storm: '#708090',
  dusk: '#b0c4de',
  blossom: '#ffb7c5',
  clay: '#c4a882',
  chalk: '#f5f5dc',
}

export const backgroundImages = [
  '/assets/backgrounds/celebration_dark_thumb_0715.svg',
  '/assets/backgrounds/video_dark_thumb_0615.svg',
  '/assets/backgrounds/travel_dark_thumb_0615.svg',
  '/assets/backgrounds/places_dark_thumb_0615.svg',
  '/assets/backgrounds/notes_dark_thumb_0715.svg',
  '/assets/backgrounds/recipe_dark_thumb_0615.svg',
  '/assets/backgrounds/music_dark_thumb_0615.svg',
  '/assets/backgrounds/food_dark_thumb_0615.svg',
  '/assets/backgrounds/grocery_dark_thumb_0615.svg',
]


