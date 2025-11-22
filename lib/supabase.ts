import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

// Client-side client (uses anon key)
// Implicit flow: tokens are extracted from URL hash and persisted to localStorage automatically
// By default, Supabase uses implicit flow for client-side auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Persist session to localStorage (default)
    autoRefreshToken: true, // Automatically refresh tokens (default)
    detectSessionInUrl: true, // Automatically detect session from URL hash (implicit flow)
  },
  global: {
    headers: {
      // Don't send auth headers for public read queries - let RLS handle it
      // This ensures queries work the same whether user is authenticated or not
    },
  },
});

// Create a separate anonymous client for public read queries
// This ensures queries work the same way regardless of authentication state
// We explicitly sign out to ensure no auth tokens are sent
export const supabaseAnonymous = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist sessions for this client
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? {
      getItem: () => null, // Always return null - no stored session
      setItem: () => {}, // Ignore session storage
      removeItem: () => {}, // Ignore removal
    } : undefined,
  },
});

// Explicitly ensure anonymous client has no session
if (typeof window !== 'undefined') {
  // Remove any potential session on initialization
  supabaseAnonymous.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      console.log("⚠️ Anonymous client had a session, clearing it...");
      supabaseAnonymous.auth.signOut({ scope: 'local' }).catch(() => {
        // Ignore errors - we just want to ensure no session
      });
    }
  }).catch(() => {
    // Ignore errors during initialization check
  });
}

// Server-side client (uses service role key for writes)
// This should only be used in API routes or server components
export function getSupabaseServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please check your .env.local file."
    );
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

