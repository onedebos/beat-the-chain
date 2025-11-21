"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function TwitterPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for OAuth callback code in URL
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");

      if (error) {
        console.error("OAuth error:", error);
        // Clean up URL
        window.history.replaceState({}, "", "/twitter");
      } else if (code) {
        console.log("Exchanging code for session:", code);
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        console.log("Code exchange result:", { data, error: exchangeError });
        
        if (exchangeError) {
          console.error("Error exchanging code:", exchangeError);
        }
        
        // Clean up URL
        window.history.replaceState({}, "", "/twitter");
      }
    };

    handleAuthCallback();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Log user data when user changes
  // useEffect(() => {
  //   if (user) {
  //       console.log("The handle", {handle: user.user_metadata?.user_name}),
  //     console.log("Signed in user data:", {
  //       id: user.id,
  //       email: user.email,
  //       user_metadata: user.user_metadata,
  //       app_metadata: user.app_metadata,
  //       created_at: user.created_at,
  //       updated_at: user.updated_at,
  //       aud: user.aud,
  //       confirmation_sent_at: user.confirmation_sent_at,
  //       confirmed_at: user.confirmed_at,
  //       email_confirmed_at: user.email_confirmed_at,
  //       phone_confirmed_at: user.phone_confirmed_at,
  //       last_sign_in_at: user.last_sign_in_at,
  //       role: user.role,
  //     });
  //   }
  // }, [user]);

  async function signInWithTwitter() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "twitter",
        
      }
    
    );

      console.log("Sign in result:", { data, error });
      
      if (error) {
        console.error("Sign in error:", error);
        alert(`Sign in error: ${error.message}`);
      }
    } catch (err) {
      console.error("Unexpected error during sign in:", err);
      alert(`Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      console.log("Sign out result:", { error });
      
      if (error) {
        console.error("Sign out error:", error);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Unexpected error during sign out:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-bg text-dark-main font-sans">
        <div className="text-center">
          <div className="mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-dark-bg text-dark-main font-sans">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-dark-highlight font-nfs mb-8">
          Twitter Authentication
        </h1>

        {user ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-dark-kbd bg-dark-kbd/40 p-6">
              <div className="text-sm text-dark-dim mb-2">Signed in as:</div>
              <div className="text-lg font-bold text-dark-highlight font-mono">
                @{user.user_metadata?.user_name || user.id}
              </div>
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-16 h-16 rounded-full mx-auto mt-4"
                />
              )}
            </div>
            <button
              onClick={signOut}
              className="rounded-full border border-dark-dim/30 py-3 px-6 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer"
              style={{ backgroundColor: "#39ff9c" }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithTwitter}
            className="rounded-full border border-dark-dim/30 py-3 px-6 text-sm font-bold text-black font-mono transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-3 mx-auto"
            style={{ backgroundColor: "#39ff9c" }}
          >
            <i className="fa-brands fa-x-twitter h-5 w-5" />
            <span>Sign in with Twitter</span>
          </button>
        )}
      </div>
    </div>
  );
}

