import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  await ensureUserSynced(userId);
  return userId;
}

export async function ensureUserSynced(userId?: string): Promise<string | null> {
  const { userId: authId } = await auth();
  const id = userId ?? authId;
  if (!id) return null;

  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (existing) return id;

  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== id) {
    // Still create a stub so FKs work for webhook-less flows
    await db
      .insert(users)
      .values({
        id,
        displayName: "Player",
      })
      .onConflictDoNothing();
    return id;
  }

  const displayName =
    clerkUser.firstName ||
    clerkUser.username ||
    clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "Player";

  await db
    .insert(users)
    .values({
      id: clerkUser.id,
      displayName,
      imageUrl: clerkUser.imageUrl,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        displayName,
        imageUrl: clerkUser.imageUrl,
      },
    });

  return id;
}