import { Search } from 'lucide-react';

interface Props {
  value:    string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder='Поиск...' }: Props) {
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
      <Search size={14} style={{ position:'absolute', left:10, color:'var(--color-text-muted)', pointerEvents:'none' }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          paddingLeft:32, paddingRight:12, height:36, width:280,
          border:'1px solid var(--color-border)',
          borderRadius:'var(--radius-md)',
          background:'var(--color-bg-elevated)',
          color:'var(--color-text-primary)',
          fontSize:13, outline:'none',
          fontFamily:'var(--font-body)',
        }}
      />
    </div>
  );
}
