// VOY Lite is served directly via middleware rewrite: / → /VOY-Lite.html
// This page component is never rendered for the root route.
// Kept as a no-op to satisfy Next.js app router requirements.
export default function Home() {
  return null
}
