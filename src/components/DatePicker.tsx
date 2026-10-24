import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { addMonths, formatDate, today } from '../lib/dates';
import type { ISODate } from '../lib/types';
import { radius, space, useTheme } from '../theme';
import { Icon } from './Icon';
import { Button, IconButton, Sheet, T, styles } from './ui';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A minimal calendar picker that behaves the same on Android and web. */
export function DateField({ value, onChange, placeholder = 'Select date', clearable }: { value: ISODate | null; onChange: (d: ISODate | null) => void; placeholder?: string; clearable?: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value ?? today()).slice(0, 7) + '-01');

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const iso = (d: number) => `${month.slice(0, 8)}${String(d).padStart(2, '0')}`;
  const t0 = today();

  return (
    <>
      <Pressable
        onPress={() => {
          setMonth((value ?? today()).slice(0, 7) + '-01');
          setOpen(true);
        }}
        style={[styles.input, styles.row, { borderColor: t.border, backgroundColor: t.surface, justifyContent: 'space-between' }]}
      >
        <T color={value ? t.text : t.textFaint}>{value ? formatDate(value, { year: true }) : placeholder}</T>
        <Icon name="calendar" size={18} color={t.textMuted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Pick a date">
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: space.sm }]}>
          <IconButton icon="chevronLeft" label="Previous month" onPress={() => setMonth(addMonths(month, -1))} />
          <T v="bodyStrong">
            {MONTHS[m - 1]} {y}
          </T>
          <IconButton icon="chevronRight" label="Next month" onPress={() => setMonth(addMonths(month, 1))} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((d, i) => (
            <T key={i} v="small" faint style={{ width: `${100 / 7}%`, textAlign: 'center', marginBottom: 6 }}>
              {d}
            </T>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            if (d == null) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
            const date = iso(d);
            const sel = date === value;
            const isToday = date === t0;
            return (
              <Pressable
                key={date}
                onPress={() => {
                  onChange(date);
                  setOpen(false);
                }}
                style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: sel ? t.accent : 'transparent',
                    borderWidth: isToday && !sel ? 1 : 0,
                    borderColor: t.border,
                  }}
                >
                  <T color={sel ? t.onAccent : t.text}>{d}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.row, { gap: space.sm, marginTop: space.md }]}>
          <Button
            kind="secondary"
            small
            label="Today"
            onPress={() => {
              onChange(t0);
              setOpen(false);
            }}
          />
          {clearable ? (
            <Button
              kind="ghost"
              small
              label="Clear"
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </>
  );
}
