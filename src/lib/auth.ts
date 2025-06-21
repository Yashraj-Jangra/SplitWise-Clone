
import { mockUsers } from "@/lib/mock-data";
import type { User } from "@/types";

// In a real production app, this function would get the user from a server-side session, cookie, or authentication header.
// It's the single source of truth for the "current user" on the server.
export async function getCurrentUser(): Promise<User> {
  // For now, we'll simulate by returning a specific user from our mock data.
  // This ensures all server components render data for "Alice" consistently.
  const user = mockUsers.find(u => u.id === 'user1');
  if (!user) {
    // This should not happen in the mock setup, but it's good practice.
    throw new Error("Default current user for server rendering not found.");
  }
  return Promise.resolve(user);
}

export async function getUserById(id: string): Promise<User | undefined> {
    return Promise.resolve(mockUsers.find(u => u.id === id));
}
