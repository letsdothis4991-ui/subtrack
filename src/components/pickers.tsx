import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { CURRENCIES } from '../lib/currency';
import { PALETTE } from '../lib/presets';
import { useStore } from '../store';
import { space, useTheme } from '../theme';
import { Icon } from './Icon';
import { Button, Chip, Input, Sheet, T, styles } from './ui';

export function CurrencyField({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(
    () => CURRENCIES.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  );
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={`Currency ${value}`}
        style={[styles.input, styles.row, { borderColor: t.border, backgroundColor: t.surface, justifyContent: 'space-between', gap: 6 }]}
      >
        <T v="bodyStrong">{value}</T>
        <Icon name="chevronDown" size={16} color={t.textMuted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Currency">
        <Input placeholder="Search" value={q} onChangeText={setQ} autoCorrect={false} />
        <ScrollView style={{ marginTop: space.sm }}>
          {list.map((c) => (
            <Pressable
              key={c.code}
              onPress={() => {
                onChange(c.code);
                setOpen(false);
                setQ('');
              }}
              style={[styles.listRow, { borderBottomColor: t.border }]}
            >
              <T v="bodyStrong" style={{ width: 52 }}>
                {c.code}
              </T>
              <T muted style={{ flex: 1 }}>
                {c.name}
              </T>
              {c.code === value ? <Icon name="check" size={18} color={t.accent} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

export function CategoryPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const [adding, setAdding] = useState(false);
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} color={c.color} selected={c.id === value} onPress={() => onChange(c.id)} />
        ))}
        <Chip label="+ New" onPress={() => setAdding(true)} />
      </View>
      <CategoryEditor
        visible={adding}
        onClose={() => setAdding(false)}
        onSave={(name, color) => {
          onChange(addCategory({ name, color, budget: null }));
          setAdding(false);
        }}
      />
    </>
  );
}

export function CategoryEditor({
  visible,
  onClose,
  onSave,
  initialName = '',
  initialColor = PALETTE[6],
  title = 'New category',
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  initialName?: string;
  initialColor?: string;
  title?: string;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Input placeholder="e.g. Kids, Work tools" value={name} onChangeText={setName} autoFocus />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: space.lg }}>
        {PALETTE.map((p) => (
          <Pressable
            key={p}
            onPress={() => setColor(p)}
            accessibilityLabel={`Colour ${p}`}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p, borderWidth: color === p ? 3 : 0, borderColor: '#ffffffcc' }}
          />
        ))}
      </View>
      <Button
        label="Save"
        disabled={!name.trim()}
        onPress={() => {
          onSave(name.trim(), color);
          setName('');
        }}
      />
    </Sheet>
  );
}
