import { expo } from "@better-auth/expo";
import { eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
// import { bearer } from 'better-auth/plugins/bearer'
import { admin, bearer } from "better-auth/plugins";
import { betterAuth } from "better-auth";

import { trustedOrigins } from "@/utils/env";
import { sendEmail } from "@/utils/email";
import { resetPasswordEmail, verificationEmail } from "@/utils/email_templates";
import { account, rateLimit, session, user, verification } from "@/db/schema";
import { db } from "@/utils/config";
import { deleteImage } from "@/utils/image-storage";
import { redirect } from "next/navigation";

export const auth = betterAuth({
  appName: "My Notes",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_BASE_URL,
  basePath: process.env.BETTER_AUTH_BASE_PATH,
  trustedOrigins,
  user: {
    deleteUser: { enabled: true },
    changeEmail: { enabled: true, updateEmailWithoutVerification: false },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      account,
      session,
      verification,
      rateLimit,
    },
  }),
  onAPIError: {
    onError: () => {
      throw redirect("/");
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user: { email }, token }) => {
      const url = `${process.env.APP_URL}/auth/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Reset your password",
        text: `Click the link to reset your password:\n${url}`,
        html: resetPasswordEmail(url),
      });
    },
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user: { email }, token }) => {
      const url = `${process.env.APP_URL}/?token=${token}`;
      await sendEmail({
        to: email,
        subject: "Verify your email address",
        text: `Click the link to verify your email address:\n${url}`,
        html: verificationEmail(url),
      });
    },
  },
  account: {
    encryptOAuthTokens: true,
    storeStateStrategy: "cookie",
  },
  // rateLimit: {
  //   enabled: true,
  //   window: 10,
  //   max: 100,
  //   storage: 'database',
  //   customRules: {
  //     '/sign-in/email': { window: 60, max: 5 },
  //     '/sign-up/email': { window: 60, max: 5 },
  //     '/forget-password': { window: 60, max: 5 },
  //     '/reset-password': { window: 60, max: 5 },
  //   },
  // },
  advanced: {
    useSecureCookies: process.env.BETTER_AUTH_SECURE_COOKIES === "true",
    defaultCookieAttributes: {
      sameSite:
        process.env.BETTER_AUTH_COOKIE_SAMESITE === "strict" ? "strict" : "lax",
      httpOnly: true,
      secure: process.env.BETTER_AUTH_SECURE_COOKIES === "true",
      path: "/",
    },

    disableCSRFCheck: true, // TODO: for production should be false
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      disableIpTracking: false,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [bearer(), expo(), admin(), nextCookies()],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/update-user") {
        const body = ctx.body as { image?: unknown } | undefined;
        if (body && "image" in body && body.image == null) {
          const oldImage = ctx.context.session?.user.image;
          if (oldImage) {
            void deleteImage(oldImage);
          }
        }
      }

      if (
        ctx.path === "/sign-in/email" ||
        ctx.path === "/sign-in/username" ||
        ctx.path.startsWith("/get-session")
      ) {
        const userId = ctx.context.newSession?.user.id;
        if (userId) {
          await db
            .update(user)
            .set({ lastSeenAt: new Date() })
            .where(eq(user.id, userId));
        }
      }
    }),
  },
});
