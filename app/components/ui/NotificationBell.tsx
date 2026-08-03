'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, X } from 'lucide-react';
import { dataService } from '../../lib/services/dataService';
import { useAuth } from '../../lib/context/AuthContext';
import { AppNotification } from '../../lib/types';

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!user) return;
    setNotifications(dataService.getNotifications(user.id));
  };

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener('hrms-notifications-updated', onUpdate);
    window.addEventListener('focus', onUpdate);
    const interval = setInterval(onUpdate, 20000);
    return () => {
      window.removeEventListener('hrms-notifications-updated', onUpdate);
      window.removeEventListener('focus', onUpdate);
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && user) {
      dataService.markAllNotificationsRead(user.id);
    }
  };

  const handleClickNotification = (n: AppNotification) => {
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={styles.bellButton}
        aria-label="Notifications"
      >
        <Bell size={18} color="#475569" />
        {unread > 0 && (
          <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={() => { if (user) dataService.markAllNotificationsRead(user.id); }}
                style={styles.markAllBtn}
                title="Mark all as read"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                No notifications
              </p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  style={{
                    ...styles.notificationItem,
                    background: n.read ? '#fff' : '#f0fdf4'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: n.read ? 500 : 600, color: '#0f172a' }}>{n.title}</span>
                    {!n.read && <span style={styles.unreadDot} />}
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', textAlign: 'left', lineHeight: '1.4' }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bellButton: {
    position: 'relative',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: '#ef4444',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px'
  },
  dropdown: {
    position: 'absolute',
    top: '48px',
    right: 0,
    width: '340px',
    maxWidth: '90vw',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    border: '1px solid #e2e8f0',
    zIndex: 2000,
    overflow: 'hidden'
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0'
  },
  markAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    color: '#10b981',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  notificationItem: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    textAlign: 'left'
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
    flexShrink: 0
  }
};
