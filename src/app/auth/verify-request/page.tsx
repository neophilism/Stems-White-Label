export default function VerifyRequestPage() {
  return (
    <main className="storefront-shell customer-signin customer-signin--single">
      <section className="customer-signin__customer">
        <p className="micro-label">Check your email</p>
        <h1>Your private sign-in link has been sent.</h1>
        <p>
          Open the message on this device or another browser. The link is
          single-use and expires automatically.
        </p>
      </section>
    </main>
  );
}
