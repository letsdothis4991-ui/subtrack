import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { font, radius, space, useTheme } from '../theme';
import { CONTENT_WIDTH } from './ui';

interface ToastState {
  id: number;
  message: string | null;
  action: { label: string; run: () => void } | null;
}

const useToastStore = create<ToastState>(() => ({ id: 0, message: null, action: null }));

/** Shows a short message at the bottom of the screen, optionally with an action such as "Undo". */
export function showToast(message: string, action?: { label: string; run: () => void }) {
  useToastStore.setState((s) => ({ id: s.id + 1, message, action: action ?? null }));
}

const hide = () => useToastStore.setState({ message: null, action: null });

/** Renders the current toast above the tab bar. Mount once, at the root. */
export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, message, action } = useToastStore();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 5000);
    return () => clearTimeout(timer);
  }, [id, message]);

  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 72, alignItems: 'center', paddingHorizontal: space.lg }}>
      <View
        accessibilityLiveRegion="polite"
        style={{
          width: '100%',
          maxWidth: CONTENT_WIDTH,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingVertical: 12,
          paddingLeft: space.lg,
          paddingRight: space.sm,
          borderRadius: radius.md,
          backgroundColor: t.dark ? '#F1F1EC' : '#1E1E1C',
        }}
      >
        <Text style={[font.body, { flex: 1, color: t.dark ? '#141414' : '#F1F1EC' }]} numberOfLines={2}>
          {message}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              action.run();
              hide();
            }}
            hitSlop={8}
            style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={[font.bodyStrong, { color: t.dark ? t.accent : '#9FD3C4' }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
