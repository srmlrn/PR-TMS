export function ApiBanner({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <p className="tms-t3 mb2">Loading live data…</p>;
  }
  if (error) {
    return (
      <p className="tms-t3 mb2" style={{ color: 'var(--amber)' }}>
        API unavailable — showing demo fallback. ({error})
      </p>
    );
  }
  return null;
}
