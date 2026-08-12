import Link from 'next/link';
import {Button, Field, TextInput} from '@motionknowledge/ui';
import {brand} from '@motionknowledge/config';
import {signInAction} from '../actions';

export default async function LoginPage({searchParams}: {searchParams: Promise<{error?: string}>}) {
  const {error} = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        action={signInAction}
        className="w-full max-w-sm rounded-xl border border-[#2a4568] bg-[#10213a] p-8"
      >
        <h1 className="mb-1 text-2xl font-bold text-[#f8fafc]">Welcome back</h1>
        <p className="mb-6 text-sm text-[#9fb2c8]">{brand.productName}</p>
        <div className="space-y-4">
          <Field label="Email">
            <TextInput name="email" type="email" autoComplete="email" required aria-label="Email" />
          </Field>
          <Field label="Password">
            <TextInput name="password" type="password" autoComplete="current-password" required aria-label="Password" />
          </Field>
          {error ? <p className="text-sm text-[#fb7185]">{error === 'invalid' ? 'Invalid email or password' : error}</p> : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </div>
        <p className="mt-6 text-sm text-[#9fb2c8]">
          New here?{' '}
          <Link href="/register" className="text-[#59d5e0]">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
