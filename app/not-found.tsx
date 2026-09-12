export default function NotFound() {
  return <main className="container" style={{ paddingBlock: '100px', maxWidth: 640 }}>
    <p className="eyebrow">PAW & CO. · 404</p><h1>A little off the trail.</h1>
    <p className="muted" style={{ marginBlock: 24 }}>We couldn’t find that page. It may have moved, or the product may no longer be available.</p>
    <a href="/shop" className="btn">Back to the collection ↗</a>
  </main>;
}
