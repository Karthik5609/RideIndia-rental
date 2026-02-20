import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function NotificationsBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    let active = true;
    let intervalId = null;

    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/notifications", { params: { limit: 12 } });
        if (!active) return;
        setItems(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        if (!active) return;
      }
    };

    fetchNotifications();
    intervalId = window.setInterval(fetchNotifications, 30000);

    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const markRead = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setItems((prev) =>
        prev.map((item) =>
          item._id === notificationId ? { ...item, isRead: true } : item
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // no-op: keep UI usable even if mark-read fails.
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // no-op
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="notify-wrap" ref={panelRef}>
      <button
        type="button"
        className="notify-btn btn-outline"
        onClick={() => setOpen((prev) => !prev)}
      >
        Notifications
        {unreadCount > 0 && <span className="notify-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notify-panel glass-card">
          <div className="notify-head">
            <h4>Updates</h4>
            <button type="button" className="btn-outline" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          <div className="notify-list">
            {items.length === 0 ? (
              <p className="hint">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={`notify-item ${item.isRead ? "read" : "unread"}`}
                  onClick={() => markRead(item._id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
