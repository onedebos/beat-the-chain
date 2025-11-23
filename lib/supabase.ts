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

// Create anonymous client lazily to avoid blocking module initialization
// This prevents the main supabase client's auth initialization from delaying queries
let _supabaseAnonymous: ReturnType<typeof createClient> | null = null;

function createAnonymousClient() {
  if (!_supabaseAnonymous) {
    _supabaseAnonymous = createClient(supabaseUrl, supabaseAnonKey, {
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
  }
  return _supabaseAnonymous;
}

// Export as lazy getter - created only when first accessed
export const supabaseAnonymous = new Proxy({} as any, {
  get(_target, prop) {
    const client = createAnonymousClient();
    const value = (client as any)[prop];
    // If it's a method, bind it to the client
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

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

