import { auth, currentUser } from "@clerk/nextjs/server";
import { queryOne } from "./db";

export type DbUser = {
  id: string;
  clerk_user_id: string;
  email: string;
};

/** Resolve Clerk session to an internal users row, creating one on first visit. */
export async function requireDbUser(): Promise<DbUser> {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError("Sign in to continue.");
  }

  let user = await queryOne<DbUser>(
    "SELECT id, clerk_user_id, email FROM users WHERE clerk_user_id = $1",
    [userId],
  );

  if (!user) {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ?? "unknown@documind.local";

    user = await queryOne<DbUser>(
      `INSERT INTO users (clerk_user_id, email)
       VALUES ($1, $2)
       ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, clerk_user_id, email`,
      [userId, email],
    );
  }

  if (!user) {
    throw new AuthError("Could not create your account. Try signing out and back in.");
  }

  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
