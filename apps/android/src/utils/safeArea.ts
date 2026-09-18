import { Dimensions, Platform, StatusBar as NativeStatusBar } from 'react-native';

const androidBottomInsetFallback = 16;
const androidBottomInsetMax = 48;

export function getAndroidBottomInset(windowHeight: number) {
  if (Platform.OS !== 'android') {
    return 0;
  }

  const screenHeight = Dimensions.get('screen').height;
  const statusBarHeight = NativeStatusBar.currentHeight ?? 0;
  const systemBarsHeight = Math.max(0, Math.round(screenHeight - windowHeight));
  const navigationBarHeight = Math.max(0, systemBarsHeight - statusBarHeight);

  return Math.min(Math.max(navigationBarHeight, androidBottomInsetFallback), androidBottomInsetMax);
}
