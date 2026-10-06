import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="micro-label">Archive / unavailable</p>
      <h1>This room is not open.</h1>
      <p>
        The requested work, collection, or storefront could not be found.
      </p>
      <Link className="text-link" href="/">
        Return to entrance
      </Link>
    </main>
  );
}
