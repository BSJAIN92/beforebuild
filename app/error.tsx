"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="auth-shell"><div className="auth-card"><h1>Let’s reconnect.</h1><p>Your saved ideas have not been deleted. A connection, access, or configuration issue interrupted this view. Try again, or contact the beta owner if your access has changed.</p><button className="button primary" onClick={reset}>Try again</button><p style={{ marginTop: 16 }}><a href="/">Reload the workspace</a></p></div></main>;
}
