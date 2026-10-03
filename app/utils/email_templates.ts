function emailShell(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:24px"><h2>${title}</h2>${body}<p style="color:#888;font-size:12px">My Notes</p></body></html>`
}

export function verificationEmail(url: string) {
  console.log(url)
  return emailShell(
    'Verify your email',
    `<p>Thanks for signing up. Please confirm your email address:</p><p><a href="${url}">Verify email address</a></p>`,
  )
}

export function resetPasswordEmail(url: string) {
  return emailShell(
    'Reset your password',
    `<p>We received a request to reset your password. This link expires in 1 hour.</p><p><a href="${url}">Choose a new password</a></p>`,
  )
}

export function sharedNoteEmail(noteTitle: string | null) {
  return emailShell(
    'A note was shared with you',
    `<p>Someone shared the note "${noteTitle ?? 'Untitled'}" with you on My Notes. Log in to view and edit it.</p>`,
  )
}
