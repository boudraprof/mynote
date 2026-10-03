import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/utils/auth";

export default async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const path = request.nextUrl.pathname;
  
  // if(path.endsWith("/")) return NextResponse.redirect(new URL("/notes", request.url));

  if (path.startsWith("/auth/") && session) {
    return NextResponse.redirect(new URL("/notes", request.url));
  }

  if ((path.startsWith("/notes") || path.startsWith("/dashboard")) && !session) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*", "/notes/:path*", "/"]
};