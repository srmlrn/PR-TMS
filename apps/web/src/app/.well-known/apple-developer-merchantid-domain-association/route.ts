/**
 * Stripe Apple Pay domain verification file.
 * Paste the file contents from Stripe Dashboard → Settings → Payment methods → Apple Pay
 * into APPLE_PAY_DOMAIN_ASSOCIATION (no file extension).
 */
export async function GET() {
  const content = process.env.APPLE_PAY_DOMAIN_ASSOCIATION?.trim();
  if (!content) {
    return new Response('Apple Pay domain association not configured', { status: 404 });
  }
  return new Response(content, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
