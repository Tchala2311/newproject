import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

// The violet/magenta haze that sits behind every screen. Two soft gradients
// positioned at opposite corners approximate the design's radial atmosphere.
export function AmbientBackground() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[colors.haloA, 'transparent']}
        start={{ x: 0.15, y: 0.1 }}
        end={{ x: 0.7, y: 0.6 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '90%', height: '70%' }}
      />
      <LinearGradient
        colors={[colors.haloB, 'transparent']}
        start={{ x: 0.85, y: 0.85 }}
        end={{ x: 0.3, y: 0.3 }}
        style={{ position: 'absolute', right: 0, bottom: 0, width: '90%', height: '70%' }}
      />
    </View>
  );
}
