'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="container" style={{ paddingBlock: '100px', maxWidth: 640 }}>
    <p className="eyebrow">PAW & CO.</p><h1>Something needs a moment.</h1>
    <p className="muted" style={{ marginBlock: 24 }}>We couldn’t load this page. Please try again.</p>
    <button className="btn" onClick={reset}>Try again</button> <a className="text-link" href="/">Return home</a>
  </main>;
}
