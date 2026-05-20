import React from 'react';
import { Text, View } from 'react-native';
import { AdYandex } from './AdYandex';

type Props = {
  height: number;
  bottomInset: number;
  index?: number;
  onCTA?: () => void;
  locked?: boolean;
  countdown?: number;
};

export function AdSlot({ height, bottomInset, locked = false, countdown = 7 }: Props) {
  const inner = <AdYandex height={height} bottomInset={bottomInset} />;

  return (
    <View style={{ height, width: '100%' }}>
      {inner}
      {/* Skip timer overlay — floats over the ad, disappears when lock releases */}
      <View style={{
        position: 'absolute',
        bottom: bottomInset + 56,
        right: 16,
        backgroundColor: locked ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: locked ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
      }}>
        <Text style={{
          color: locked ? '#fff' : 'rgba(255,255,255,0.55)',
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.3,
        }}>
          {locked ? `⏭ Пропустить через ${countdown}с` : '⏭ Свайпай вверх'}
        </Text>
      </View>
    </View>
  );
}
