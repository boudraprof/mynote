import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Playwright globalSetup for the main app (port 3000):
 *
 * 1. Guarantees the e2e sign-in users referenced by the specs exist
 *    (idempotent: better-auth returns 422 USER_ALREADY_EXISTS for duplicate
 *    sign-ups, treated as success).
 * 2. Signs in once and persists the session to a Playwright storageState file
 *    used by the main-app projects, so every test starts authenticated. This
 *    avoids per-test logins tripping the app's sign-in rate limit
 *    (`/sign-in/email`: max 5 per minute in src/utils/auth.ts).
 *
 * The creds here must match what the specs reference:
 *   - e2e/{checklist,image-upload,labels,notes,profile}.spec.ts use
 *     test@example.com / password123
 *   - e2e/search.spec.ts uses email@email.com / password
 */
const MAIN_BASE_URL = process.env.E2E_MAIN_BASE_URL || 'http://localhost:3000'
const AUTH_STATE_PATH = 'e2e/.auth/main-user.json'

const PRIMARY_USER = {
  email: process.env.E2E_MAIN_EMAIL || 'test@example.com',
  password: process.env.E2E_MAIN_PASSWORD || 'password',
  name: 'E2E User',
}

const USERS = [
  PRIMARY_USER,
  {
    email: 'email@email.com',
    password: 'password',
    name: 'Search E2E User',
  }
]

async function ensureUser(
  user: { email: string; password: string; name: string },
  origin: string,
) {
  const res = await fetch(`${MAIN_BASE_URL}/api/v1/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // undici always sends `sec-fetch-mode: cors`, which makes better-auth
      // force the origin check — send a trusted Origin explicitly.
      Origin: origin,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      name: user.name,
    }),
  })

  if (res.ok) {
    console.log(`[main-app-global-setup] provisioned ${user.email}`)
    return
  }
  
  if (res.status === 422) {
    // Already exists — exactly what we want.
    return
  }
  throw new Error(
    `Failed to provision e2e user ${user.email} (${res.status}): ${await res.text()}`,
  )
}

function parseSetCookie(raw: string) {
  const [pair = '', ...attrParts] = raw.split(';')
  const eq = pair.indexOf('=')
  const attrs = new Map(
    attrParts.map((part) => {
      const i = part.indexOf('=')
      return [
        part.slice(0, i).trim().toLowerCase(),
        i >= 0 ? part.slice(i + 1).trim() : 'true',
      ]
    }),
  )
  const sameSite = (attrs.get('samesite') ?? 'lax').toLowerCase()
  return {
    name: pair.slice(0, eq).trim(),
    value: pair.slice(eq + 1).trim(),
    domain: attrs.get('domain') ?? 'localhost',
    path: attrs.get('path') ?? '/',
    expires: attrs.has('expires') ? new Date(attrs.get('expires')!).getTime() : -1,
    httpOnly: raw.toLowerCase().includes('httponly'),
    secure: attrs.get('secure') === 'true',
    sameSite: sameSite === 'strict' ? 'Strict' : sameSite === 'none' ? 'None' : 'Lax',
  }
}

async function signInAndPersistState(
  user: { email: string; password: string },
  origin: string,
) {
  const res = await fetch(`${MAIN_BASE_URL}/api/v1/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })
  if (!res.ok) {
    throw new Error(
      `Failed to sign in e2e user ${user.email} (${res.status}): ${await res.text()}`,
    )
  }

  const cookies = (res.headers.getSetCookie?.() ?? []).map(parseSetCookie)
  mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true })
  writeFileSync(AUTH_STATE_PATH, JSON.stringify({ cookies, origins: [] }, null, 2))
  console.log(
    `[main-app-global-setup] saved auth state for ${user.email} (${cookies.length} cookie(s))`,
  )
}

export default async function globalSetup() {
  const origin = new URL(MAIN_BASE_URL).origin
  for (const user of USERS) {
    await ensureUser(user, origin)
  }
  await signInAndPersistState(PRIMARY_USER, origin)
}
