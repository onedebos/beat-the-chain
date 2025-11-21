import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  // Create a redirect URL with the code/error as query params
  // The client-side will handle the code exchange
  const redirectUrl = new URL("/", request.url);
  
  if (error) {
    redirectUrl.searchParams.set("error", error);
  }
  
  if (code) {
    redirectUrl.searchParams.set("code", code);
  }

  return NextResponse.redirect(redirectUrl);
}

