export function PageLoader() {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'60vh', flexDirection:'column', gap:12,
    }}>
      <div style={{
        width:32, height:32,
        border:'3px solid var(--color-border)',
        borderTopColor:'var(--color-amber)',
        borderRadius:'50%',
        animation:'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
