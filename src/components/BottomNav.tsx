import React from 'react';
import { Pressable, Text, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { colors, fontFamily } from '../theme';

export type Tab = 'feed' | 'explore' | 'profile';

type Props = {
  tab: Tab;
  setTab: (t: Tab) => void;
  bottomInset: number;
};

const items: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'feed',
    label: 'Для тебя',
    icon: (active) => (
      <Svg width={20} height={20} viewBox="0 0 20 20">
        <Rect x={2} y={2} width={7} height={7} rx={2} fill={active ? colors.text : colors.textDim} />
        <Rect x={11} y={2} width={7} height={7} rx={2} fill={active ? colors.text : colors.textDim} opacity={0.55} />
        <Rect x={2} y={11} width={7} height={7} rx={2} fill={active ? colors.text : colors.textDim} opacity={0.55} />
        <Rect x={11} y={11} width={7} height={7} rx={2} fill={active ? colors.text : colors.textDim} />
      </Svg>
    ),
  },
  {
    id: 'explore',
    label: 'Поиск',
    icon: (active) => (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Circle cx={10} cy={10} r={7.5} stroke={active ? colors.text : colors.textDim} strokeWidth={1.6} />
        <Circle cx={10} cy={10} r={2.5} fill={active ? colors.text : colors.textDim} />
      </Svg>
    ),
  },
  {
    id: 'profile',
    label: 'Профиль',
    icon: (active) => (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Circle cx={10} cy={7.5} r={3.2} stroke={active ? colors.text : colors.textDim} strokeWidth={1.6} />
        <Path
          d="M3 17.5c0-3.5 3.1-6.2 7-6.2s7 2.7 7 6.2"
          stroke={active ? colors.text : colors.textDim}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    ),
  },
];

export function BottomNav({ tab, setTab, bottomInset }: Props) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60 + bottomInset,
        paddingBottom: bottomInset,
        backgroundColor: Platform.OS === 'android' ? 'rgba(6,6,16,0.92)' : 'rgba(6,6,16,0.55)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.07)',
      }}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={50}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {items.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={{
                alignItems: 'center',
                gap: 3,
                opacity: active ? 1 : 0.55,
                transform: [{ scale: active ? 1.06 : 1 }],
              }}
            >
              {item.icon(active)}
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: fontFamily.bold,
                  color: active ? colors.text : colors.textDim,
                  letterSpacing: 0.4,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
