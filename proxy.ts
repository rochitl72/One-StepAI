import { auth0 } from "./lib/auth0";

/** Next.js 16 + @auth0/nextjs-auth0: use `proxy.ts` (middleware.ts is deprecated for Node runtime). */
export async function proxy(request: Request) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
