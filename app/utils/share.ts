import { eq } from "drizzle-orm";

import { db } from "@/utils/config";
import { user } from "@/db/schema";

/**
 * Resolve the current user's email from their user id. Returns `null` if the
 * user no longer exists.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const [u] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return u?.email ?? null;
}