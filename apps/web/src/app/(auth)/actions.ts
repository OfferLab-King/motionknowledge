'use server';

import {redirect} from 'next/navigation';
import {z} from 'zod';
import {createClient} from '../../lib/supabase/server';

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signUpAction(formData: FormData) {
  const parsed = AuthSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    redirect('/register?error=invalid');
  }
  const supabase = await createClient();
  const {error} = await supabase.auth.signUp(parsed.data);
  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/dashboard');
}

export async function signInAction(formData: FormData) {
  const parsed = AuthSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    redirect('/login?error=invalid');
  }
  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
