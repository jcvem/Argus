import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-6 py-16">
      <section className="max-w-md border-t border-argus-line pt-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-argus-accent">404 / outside the perimeter</p>
        <h1 className="mt-4 font-display text-5xl text-argus-ink">This view is not registered.</h1>
        <p className="mt-4 text-sm leading-6 text-argus-muted">Return to the Argus control plane and continue from a known surface.</p>
        <Link className="mt-8 inline-flex border border-argus-ink bg-argus-ink px-4 py-3 text-sm font-semibold text-argus-paper" href="/dashboard">
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}