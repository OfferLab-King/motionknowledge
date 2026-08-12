import Link from 'next/link';
import {brand} from '@motionknowledge/config';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-6xl">▶</div>
      <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-[#f8fafc]">
        Turn knowledge into <span className="text-[#59d5e0]">explained video</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-[#9fb2c8]">
        {brand.productName} compiles a topic into grounded claims, an editable script, deterministic
        visuals, timed narration, and a finished video you can review before anyone sees it.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/register"
          className="rounded-lg bg-[#59d5e0] px-6 py-3 font-semibold text-[#08111f] hover:bg-[#4bc4d0]"
        >
          Start creating
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-[#2a4568] bg-[#10213a] px-6 py-3 font-semibold text-[#f8fafc] hover:bg-[#1a3050]"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
