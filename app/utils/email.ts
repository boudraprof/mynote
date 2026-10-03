import nodemailer from 'nodemailer'

type SendArgs = {
  to: string
  subject: string
  text: string
  html?: string
}

let transporter: nodemailer.Transporter | null = null
let cachedKey: string | null = null

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST)
}

function getTransporter() {
  if (!smtpConfigured()) return null
  const key = `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}:${process.env.SMTP_USER}`
  if (transporter && cachedKey === key) return transporter
  const port = Number(process.env.SMTP_PORT || 587)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  })
  cachedKey = key
  return transporter
}

function fromAddress(): string {
  const from = process.env.SMTP_FROM || 'noreply@example.com'
  const name = process.env.SMTP_FROM_NAME
  return name ? `"${name}" <${from}>` : from
}

export function isEmailConfigured() {
  return smtpConfigured()
}

export async function sendEmail(
  args: SendArgs,
): Promise<{ success: boolean; error?: string }> {
  const tr = getTransporter()
  if (!tr) {
    // Dev fallback: print the email so the flow is testable without SMTP.
    console.log(
      `\n[email:dev] To: ${args.to}\nSubject: ${args.subject}\n${args.text}\n`,
    )
    return { success: true }
  }
  try {
    await tr.sendMail({ from: fromAddress(), ...args })
    return { success: true }
  } catch (err: any) {
    console.error('[email] send failed:', err)
    return { success: false, error: err?.message }
  }
}
