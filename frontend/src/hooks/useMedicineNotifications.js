import { useCallback, useEffect, useState } from 'react';
import { todayString } from '../utils/format';

const STORAGE_PREFIX = 'medicare_notified';

/**
 * Browser medicine reminders. Fires a local notification once per dose/day
 * when the scheduled time arrives, provided the user grants permission.
 */
export function useMedicineNotifications(doses = [], date = todayString()) {
  const [permission, setPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  const supported = typeof window !== 'undefined' && 'Notification' in window;

  const requestPermission = useCallback(async () => {
    if (!supported) return 'unsupported';
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        new window.Notification('Medicine reminders enabled', {
          body: 'MediCare AI will notify you when a scheduled dose is due while this browser is open.',
          icon: '/favicon.svg',
        });
      }
      return result;
    } catch {
      setPermission('denied');
      return 'denied';
    }
  }, [supported]);

  const sendTest = useCallback(() => {
    if (!supported || window.Notification.permission !== 'granted') return false;
    new window.Notification('Test reminder', {
      body: 'Your MediCare AI medicine notifications are working.',
      icon: '/favicon.svg',
      tag: `test-${Date.now()}`,
    });
    return true;
  }, [supported]);

  useEffect(() => {
    if (!supported) return undefined;

    const check = () => {
      if (window.Notification.permission !== 'granted') return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}`;

      doses
        .filter((dose) => dose.status === 'pending' && dose.time === currentTime)
        .forEach((dose) => {
          const key = `${STORAGE_PREFIX}_${dose.medicineId}_${date}_${dose.time}`;
          if (localStorage.getItem(key)) return;
          try {
            new window.Notification('Time for your medicine', {
              body: `Take ${dose.name} (${dose.dosage}) as prescribed.${dose.instructions ? ` ${dose.instructions}` : ''}`,
              icon: '/favicon.svg',
              tag: key,
            });
            localStorage.setItem(key, 'true');
          } catch {
            // Notifications can fail in restricted browser contexts.
          }
        });
    };

    check();
    const timer = window.setInterval(check, 30000);
    return () => window.clearInterval(timer);
  }, [doses, date, supported]);

  useEffect(() => {
    if (!supported) return undefined;
    const sync = () => setPermission(window.Notification.permission);
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [supported]);

  return { permission, supported, requestPermission, sendTest };
}
