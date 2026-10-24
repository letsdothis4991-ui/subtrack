import { type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LOGO_PATHS } from '../lib/logos.generated';
import { font, radius, space, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

/** Max content width so the web app reads well on desktop. */
export const CONTENT_WIDTH = 680;

export function Screen({
  title,
  right,
  children,
  scroll = true,
  footer,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const t = useTheme();
  const body = (
    <View style={styles.content}>
      {title ? (
        <View style={styles.header}>
          <Text style={[font.h1, { color: t.text }]} accessibilityRole="header">
            {title}
          </Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function T({
  children,
  v = 'body',
  muted,
  faint,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  v?: keyof typeof font;
  muted?: boolean;
  faint?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[font[v], { color: color ?? (faint ? t.textFaint : muted ? t.textMuted : t.text) }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const t = useTheme();
  const base = [styles.card, { backgroundColor: t.surface, borderColor: t.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, right, children, style }: { title: string; right?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: space.xl }, style]}>
      <View style={[styles.row, { marginBottom: space.sm, justifyContent: 'space-between' }]}>
        <T v="label" muted>
          {title}
        </T>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const t = useTheme();
  const colors = {
    primary: { bg: t.accent, fg: t.onAccent, border: t.accent },
    secondary: { bg: t.surface, fg: t.text, border: t.border },
    ghost: { bg: 'transparent', fg: t.accent, border: 'transparent' },
    danger: { bg: t.dangerSoft, fg: t.danger, border: t.dangerSoft },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && { paddingVertical: 8, paddingHorizontal: 12 },
        { backgroundColor: colors.bg, borderColor: colors.border, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={colors.fg} /> : null}
      <Text style={[small ? font.small : font.bodyStrong, { color: colors.fg, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color }: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? t.surfaceAlt : 'transparent' }]}
    >
      <Icon name={icon} size={22} color={color ?? t.text} />
    </Pressable>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <T v="small" muted style={{ marginBottom: 6 }}>
        {label}
      </T>
      {children}
      {hint ? (
        <T v="small" faint style={{ marginTop: 4 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.textFaint}
      {...props}
      style={[
        styles.input,
        { color: t.text, backgroundColor: t.surface, borderColor: t.border },
        props.multiline && { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
        props.style,
      ]}
    />
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected?: boolean; onPress?: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { borderColor: selected ? t.text : t.border, backgroundColor: selected ? t.text : t.surface }]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[font.small, { color: selected ? t.bg : t.text, fontWeight: '500' }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.surfaceAlt }]}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
            style={[styles.segment, sel && { backgroundColor: t.surface, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth }]}
          >
            <Text style={[font.small, { color: sel ? t.text : t.textMuted, fontWeight: sel ? '600' : '500' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({
  icon,
  label,
  value,
  onPress,
  right,
  danger,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, { borderBottomColor: t.border, opacity: pressed ? 0.6 : 1 }]}
    >
      {icon ? <Icon name={icon} size={20} color={danger ? t.danger : t.textMuted} /> : null}
      <T style={{ flex: 1 }} color={danger ? t.danger : undefined}>
        {label}
      </T>
      {value ? <T muted>{value}</T> : null}
      {right ?? (onPress ? <Icon name="chevronRight" size={18} color={t.textFaint} /> : null)}
    </Pressable>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** Service logo on its brand colour, or a coloured initial when there's no logo. */
export function Avatar({ name, color, size = 40, logo }: { name: string; color: string; size?: number; logo?: string | null }) {
  const path = logo ? LOGO_PATHS[logo] : undefined;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      {path ? (
        <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
          <Path d={path} fill="#fff" />
        </Svg>
      ) : (
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.42 }}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
      )}
    </View>
  );
}

export function Progress({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  const over = value > 1;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: t.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: over ? t.danger : color ?? t.accent }} />
    </View>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: space.xl + insets.bottom }]}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: space.md }]}>
            <T v="h2">{title}</T>
            <IconButton icon="x" label="Close" onPress={onClose} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: space.sm }}>
      <T v="h2">{title}</T>
      <T muted style={{ textAlign: 'center', maxWidth: 320 }}>
        {body}
      </T>
      {action ? <View style={{ marginTop: space.md, gap: space.sm, alignItems: 'center' }}>{action}</View> : null}
    </View>
  );
}

/** Cross-platform confirm (Alert buttons don't work on web). */
export function confirm(title: string, message: string, okLabel = 'OK', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]),
  );
}

/** Share sheet on Android; Web Share or clipboard in the browser. */
export async function shareText(message: string) {
  if (Platform.OS !== 'web') {
    await Share.share({ message });
    return;
  }
  const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
  if (nav.share) {
    await nav.share({ text: message }).catch(() => {});
  } else {
    await navigator.clipboard?.writeText(message);
    window.alert('Copied to clipboard');
  }
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

export const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.lg, paddingBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: CONTENT_WIDTH,
    maxHeight: '90%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
  },
});
