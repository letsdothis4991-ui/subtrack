import { Tabs } from 'expo-router/tabs';
import { Icon, type IconName } from '../../src/components/Icon';
import { useTheme } from '../../src/theme';

const tab = (icon: IconName) => ({ color }: { color: unknown }) => <Icon name={icon} size={22} color={String(color)} />;

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.textFaint,
        tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Subscriptions', tabBarIcon: tab('list') }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: tab('pie') }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget', tabBarIcon: tab('wallet') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tab('sliders') }} />
    </Tabs>
  );
}
