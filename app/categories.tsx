import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { CategoryEditor } from '../src/components/pickers';
import { Button, Dot, IconButton, T, confirm, styles } from '../src/components/ui';
import type { Category } from '../src/lib/types';
import { useStore } from '../src/store';
import { space, useTheme } from '../src/theme';

export default function CategoriesScreen() {
  const t = useTheme();
  const categories = useStore((s) => s.categories);
  const subscriptions = useStore((s) => s.subscriptions);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  const remove = async (c: Category) => {
    const n = subscriptions.filter((s) => s.categoryId === c.id).length;
    const msg = n ? `${n} subscription${n > 1 ? 's' : ''} will move to Other.` : 'This category is not in use.';
    if (await confirm(`Delete “${c.name}”?`, msg, 'Delete', true)) deleteCategory(c.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 64 }]}>
        {categories.map((c) => {
          const n = subscriptions.filter((s) => s.categoryId === c.id).length;
          return (
            <View key={c.id} style={[styles.listRow, { borderBottomColor: t.border }]}>
              <Pressable onPress={() => setEditing(c)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Dot color={c.color} size={14} />
                <T style={{ flex: 1 }}>{c.name}</T>
                <T v="small" faint>
                  {n}
                </T>
              </Pressable>
              {c.id !== 'other' ? <IconButton icon="trash" label={`Delete ${c.name}`} color={t.textFaint} onPress={() => remove(c)} /> : null}
            </View>
          );
        })}
        <Button kind="secondary" icon="plus" label="New category" onPress={() => setEditing('new')} style={{ marginTop: space.xl }} />
      </ScrollView>
      <CategoryEditor
        key={editing === 'new' ? 'new' : editing?.id ?? 'none'}
        visible={editing != null}
        title={editing === 'new' ? 'New category' : 'Edit category'}
        initialName={editing && editing !== 'new' ? editing.name : ''}
        initialColor={editing && editing !== 'new' ? editing.color : undefined}
        onClose={() => setEditing(null)}
        onSave={(name, color) => {
          if (editing === 'new') addCategory({ name, color, budget: null });
          else if (editing) updateCategory(editing.id, { name, color });
          setEditing(null);
        }}
      />
    </View>
  );
}
