import { useRef, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { font, space, useTheme } from '../theme';
import { Icon, type IconName } from './Icon';

interface Action {
  label: string;
  icon: IconName;
  color: string;
  /** Return false to spring the row back (e.g. the user cancelled a confirm). */
  run: () => boolean | void | Promise<boolean | void>;
}

/**
 * A list row with swipe actions: swipe right for `right` (e.g. archive), left for `left` (e.g. delete).
 * Swiping past the threshold runs the action straight away.
 */
export function SwipeRow({ children, right, left }: { children: ReactNode; right: Action; left: Action }) {
  const t = useTheme();
  const ref = useRef<SwipeableMethods>(null);


  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.5}
      leftThreshold={90}
      rightThreshold={90}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={(progress) => <Panel action={right} align="flex-start" progress={progress} />}
      renderRightActions={(progress) => <Panel action={left} align="flex-end" progress={progress} />}
      containerStyle={{ backgroundColor: t.bg }}
      childrenContainerStyle={{ backgroundColor: t.bg }}
      onSwipeableOpen={async (direction) => {
        // RIGHT = the row moved right (left panel showing).
        const action = direction === SwipeDirection.RIGHT ? right : left;
        const done = await action.run();
        if (done === false) ref.current?.close();
        else ref.current?.reset();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

/** Hidden until the row starts moving, so the coloured panel never peeks out at rest. */
function Panel({ action, align, progress }: { action: Action; align: 'flex-start' | 'flex-end'; progress: SharedValue<number> }) {
  const visible = useAnimatedStyle(() => ({ opacity: progress.value > 0.01 ? 1 : 0 }));
  return (
    <Animated.View style={[{ flex: 1, backgroundColor: action.color, justifyContent: 'center', alignItems: align, paddingHorizontal: space.xl }, visible]}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Icon name={action.icon} size={20} color="#fff" />
        <Text style={[font.small, { color: '#fff', fontWeight: '600' }]}>{action.label}</Text>
      </View>
    </Animated.View>
  );
}
