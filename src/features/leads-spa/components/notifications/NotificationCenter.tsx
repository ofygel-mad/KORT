import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifStore } from '../../model/notifications.store';
import s from './Notifications.module.css';

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { items, markRead, unreadCount } = useNotifStore();
  const count = unreadCount();

  return (
    <div className={s.wrap}>
      <button className={s.bell} onClick={() => setOpen(v => !v)}>
        <Bell size={15} />
        {count > 0 && <span className={s.badge}>{count}</span>}
      </button>
      {open && (
        <>
          <div className={s.overlay} onClick={() => setOpen(false)} />
          <div className={s.panel}>
            <div className={s.panelHeader}>Уведомления</div>
            {items.length === 0 ? (
              <div className={s.empty}>Всё спокойно</div>
            ) : items.map(n => (
              <button
                key={n.id}
                className={`${s.item} ${n.read ? s.itemRead : ''}`}
                onClick={() => { markRead(n.id); }}
              >
                {!n.read && <span className={s.unreadDot} />}
                <div className={s.itemBody}>
                  <div className={s.itemTitle}>{n.title}</div>
                  <div className={s.itemBody2}>{n.body}</div>
                  <div className={s.itemTime}>{new Date(n.createdAt).toLocaleString('ru',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
