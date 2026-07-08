'use client';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { ref, onValue } from 'firebase/database';

export type EnvDay = {
  id: string;
  name: string;
  month: number;
  day: number;
  year: number | null;
  description: string;
  category: string;
  createdBy: string;
  createdAt: string;
  editedBy: string;
  editedAt: string;
};

export function useEnvDays() {
  const [days, setDays] = useState<EnvDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const dayRef = ref(db, '/envDays');
    const unsub = onValue(
      dayRef,
      (snap) => {
        const data = snap.val();
        if (!data) {
          setDays([]);
          setLoading(false);
          setError(false);
          return;
        }
        // month/day/year are coerced since CSV-imported or hand-edited RTDB
        // rows can arrive as strings rather than the numbers the app writes.
        const list: EnvDay[] = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          name: v.name ?? '',
          month: Number(v.month) || 0,
          day: Number(v.day) || 0,
          year: v.year ? Number(v.year) : null,
          description: v.description ?? '',
          category: v.category ?? '',
          createdBy: v.createdBy ?? '',
          createdAt: v.createdAt ?? '',
          editedBy: v.editedBy ?? '',
          editedAt: v.editedAt ?? '',
        }));
        setDays(list);
        setLoading(false);
        setError(false);
      },
      (err) => {
        console.error('Failed to read /envDays — check RTDB rules for this path:', err);
        setLoading(false);
        setError(true);
      }
    );
    return () => unsub();
  }, []);

  return { days, loading, error };
}
