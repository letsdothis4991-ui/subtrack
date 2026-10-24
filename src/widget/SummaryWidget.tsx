import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetData } from './data';

const INK = '#141414';
const MUTED = '#6E6E69';
const ACCENT = '#2F6B5E';

export function SummaryWidget({ data }: { data: WidgetData | null }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#FAFAF7', borderRadius: 20, padding: 14, flexDirection: 'column' }}
    >
      <TextWidget text="PER MONTH" style={{ fontSize: 11, color: MUTED, fontWeight: '600', letterSpacing: 0.06 }} />
      <TextWidget text={data?.total ?? '—'} style={{ fontSize: 26, color: INK, fontWeight: '600' }} />
      <TextWidget text={data ? `${data.count} active` : 'Open SubTrack to set up'} style={{ fontSize: 11, color: MUTED, marginBottom: 8 }} />
      {(data?.next ?? []).map((n) => (
        <FlexWidget key={n.name} style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between', marginTop: 4 }}>
          <TextWidget text={`${n.name} · ${n.when}`} maxLines={1} truncate="END" style={{ fontSize: 12, color: INK }} />
          <TextWidget text={n.amount} style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
