/**
 * STUB — THIS IS THE SEAM BETWEEN "WORKS IN THE DEMO" AND "WORKS FOR REAL."
 *
 * Everything in this codebase calls getViewer() to find out who's looking
 * at the page. Right now it returns a fake in-memory viewer so the rest of
 * the app is fully wireable and testable. Before this goes live, replace
 * the body of this function with a real session lookup:
 *
 *  - If Misfit Ministries already has its own sign-in (you mentioned
 *    "unless you're already signed in to Ministries" — meaning there IS
 *    an existing session mechanism), the cleanest path is sharing that
 *    session/cookie across both apps (same top-level domain, same auth
 *    provider or a shared JWT).
 *  - If not, NextAuth.js or Clerk are the fastest to stand up from scratch.
 *
 * Anonymous Street-tier visitors do NOT go through this function returning
 * null and stopping there — see anonymous-identity.ts for how a Street
 * visitor still gets a stable member row without ever signing in.
 */

export type Viewer = {
  id: string;
  email: string | null;
};

export async function getViewer(): Promise<Viewer | null> {
  // DEMO BEHAVIOR ONLY — replace before production.
  // Returning null here means "treat as anonymous Street tier," which is
  // the correct default for anyone this function can't identify.
  return null;
}
