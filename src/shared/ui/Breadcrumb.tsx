import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Item {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Item[] }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18 }}>
      {items.map((item, idx) => (
        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {idx > 0 && <ChevronRight size={12} style={{ color: 'var(--color-text-muted)' }} />}
          {item.to ? (
            <Link
              to={item.to}
              style={{ fontSize: 13, color: 'var(--color-text-muted)', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
