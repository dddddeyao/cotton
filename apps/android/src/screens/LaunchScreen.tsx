import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type LaunchScreenProps = {
  isReady: boolean;
  onFinish: () => void;
};

const APPEAR_MS = 1400;
const MIN_VISIBLE_MS = 1900;

export function LaunchScreen({ isReady, onFinish }: LaunchScreenProps) {
  const finishedRef = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: APPEAR_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: APPEAR_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => setMinimumElapsed(true), MIN_VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [opacity, scale]);

  useEffect(() => {
    if (!isReady || !minimumElapsed || finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    onFinish();
  }, [isReady, minimumElapsed, onFinish]);

  return (
    <View style={styles.screen}>
      <Animated.Image
        accessible
        accessibilityRole="image"
        accessibilityLabel="棉花识别助手图标"
        source={require('../../assets/icon.png')}
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 172,
    height: 172,
  },
});
