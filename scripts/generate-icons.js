/**
 * Generates every mobile app icon/splash/favicon asset from a single square
 * source logo (`assets/logo512.png`), keeping all layers in sync.
 *
 * Usage: node scripts/generate-icons.js
 *
 * - App icon: flattened onto white — home-screen icons must have no alpha.
 * - iOS liquid glass icon: alpha preserved (required for the glass effect).
 * - Splash/favicon/Android foreground: alpha preserved.
 * - Android monochrome + iOS tinted: white silhouette (themed icons).
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const SOURCE = path.join(__dirname, '..', 'assets', 'logo512.png')
const out = (p) => path.join(__dirname, '..', p)

async function whiteSilhouette(size, dest) {
  const { data, info } = await sharp(SOURCE)
    .resize(size, size)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    // Keep the alpha channel, force RGB to white (0 alpha stays black/invisible).
    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(dest)
}

async function main() {
  await fs.promises.mkdir(out('assets/expo.icon'), { recursive: true })

  // Home-screen app icon (Expo Go + native fallback). No transparency.
  await sharp(SOURCE)
    .resize(1024, 1024)
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(out('assets/images/icon.png'))

  // iOS liquid glass icon (SDK 54+ `.icon` folder). Alpha is required.
  await sharp(SOURCE)
    .resize(1024, 1024)
    .png()
    .toFile(out('assets/expo.icon/app-icon-1024.png'))
  await whiteSilhouette(1024, out('assets/expo.icon/app-icon-tinted-1024.png'))

  // Splash screen image (displayed on the #208AEF background).
  await sharp(SOURCE)
    .resize(1024, 1024)
    .png()
    .toFile(out('assets/images/splash-icon.png'))

  // Web favicon.
  await sharp(SOURCE)
    .resize(48, 48)
    .png()
    .toFile(out('assets/images/favicon.png'))

  // Android adaptive icon layers.
  await sharp(SOURCE)
    .resize(512, 512)
    .png()
    .toFile(out('assets/images/android-icon-foreground.png'))
  await whiteSilhouette(512, out('assets/images/android-icon-monochrome.png'))

  console.log(
    'Generated mobile app icon assets from',
    path.relative(process.cwd(), SOURCE),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
