import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, fontFamily, radius } from '../theme';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      // Only log full details in development — stack traces can contain
      // user IDs or API response snippets that must not appear in prod logs.
      console.warn('[Loop] crashed:', error.message, info.componentStack);
    }
    // TODO: pipe sanitized event to Sentry / AppMetrica once backend is wired.
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 56 }}>💥</Text>
        <Text style={{ color: colors.text, fontFamily: fontFamily.bold, fontSize: 20 }}>
          Что-то сломалось
        </Text>
        <Text
          style={{
            color: colors.textDim,
            fontFamily: fontFamily.medium,
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 280,
          }}
        >
          {__DEV__ ? (error.message || 'Неизвестная ошибка') : 'Неизвестная ошибка'}
        </Text>
        <Pressable
          onPress={this.reset}
          style={{
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: radius.pill,
            backgroundColor: colors.glassBgStrong,
            borderWidth: 1,
            borderColor: colors.glassBorderStrong,
            marginTop: 8,
          }}
        >
          <Text style={{ color: colors.text, fontFamily: fontFamily.bold, fontSize: 14 }}>
            Попробовать снова ↺
          </Text>
        </Pressable>
      </View>
    );
  }
}
