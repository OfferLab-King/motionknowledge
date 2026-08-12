import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {NextResponse, type NextRequest} from 'next/server';

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({request});
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const {name, value} of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const {name, value} of cookiesToSet) {
            response.cookies.set(name, value);
          }
        },
      },
    },
  );
  void cookieStore;
  await supabase.auth.getUser();
  return response;
}
