import type { ImageSourcePropType } from 'react-native'

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
} as const;

export const backgroundImages: Record<string, ImageSourcePropType> = {
  celebration_dark_thumb_0715: require('../../assets/backgrounds/celebration_dark_thumb_0715.png'),
  video_dark_thumb_0615: require('../../assets/backgrounds/video_dark_thumb_0615.png'),
  travel_dark_thumb_0615: require('../../assets/backgrounds/travel_dark_thumb_0615.png'),
  places_dark_thumb_0615: require('../../assets/backgrounds/places_dark_thumb_0615.png'),
  notes_dark_thumb_0715: require('../../assets/backgrounds/notes_dark_thumb_0715.png'),
  recipe_dark_thumb_0615: require('../../assets/backgrounds/recipe_dark_thumb_0615.png'),
  music_dark_thumb_0615: require('../../assets/backgrounds/music_dark_thumb_0615.png'),
  food_dark_thumb_0615: require('../../assets/backgrounds/food_dark_thumb_0615.png'),
  grocery_dark_thumb_0615: require('../../assets/backgrounds/grocery_dark_thumb_0615.png'),
  } as const;
