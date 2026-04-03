export default function WarehousePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 12,
      color: 'var(--text-tertiary)',
      fontSize: 14,
    }}>
      <span style={{ fontSize: 32 }}>🏗️</span>
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Склад — в разработке</div>
      <div>Промышленная WMS система строится здесь</div>
    </div>
  );
}
