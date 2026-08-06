// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// expo-sqlite's web build imports its wa-sqlite WASM bundle as an asset.
config.resolver.assetExts.push('wasm')

module.exports = config
