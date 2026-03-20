import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import HomeScreen from './index';
import DiscoverScreen from './explore';
import SearchScreen from './search';
import ProfileScreen from './profile';

const ROUTES = ['index', 'explore', 'search', 'profile'] as const;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
};

function VinylIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.6} />
      <Circle cx="12" cy="12" r="2.4" stroke={color} strokeWidth={1.6} />
      <Path d="M12 4.2A7.8 7.8 0 0 1 19.8 12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function CompassIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={1.6} />
      <Path
        d="M14.9 9.1L13.4 13.4L9.1 14.9L10.6 10.6L14.9 9.1Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="1.1" fill={color} />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6.8" stroke={color} strokeWidth={1.6} />
      <Path d="M16.2 16.2L20 20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth={1.6} />
      <Path
        d="M5 18.3C5.9 15.9 8.6 14.6 12 14.6C15.4 14.6 18.1 15.9 19 18.3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function rubberBand(value: number, min: number, max: number) {
  'worklet';
  if (value < min) {
    return min - (min - value) * 0.22;
  }
  if (value > max) {
    return max + (value - max) * 0.22;
  }
  return value;
}

function IndicatorDot({
  index,
  progress,
}: {
  index: number;
  progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      width: interpolate(distance, [0, 1], [20, 6], Extrapolation.CLAMP),
      backgroundColor: distance < 0.5 ? '#fff' : '#333',
      opacity: interpolate(distance, [0, 1], [1, 0.9], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

function TabButton({
  index,
  label,
  progress,
  onPress,
  renderIcon,
}: {
  index: number;
  label: string;
  progress: SharedValue<number>;
  onPress: () => void;
  renderIcon: (color: string) => React.ReactNode;
}) {
  const activeStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      opacity: interpolate(distance, [0, 1], [1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [0, 1], [1, 0.96], Extrapolation.CLAMP) }],
    };
  });

  const inactiveStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      opacity: interpolate(distance, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [0, 1], [1, 0.98], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <View style={styles.tabInner}>
        <Animated.View style={[styles.tabLayer, inactiveStyle]}>
          {renderIcon('#444')}
          <Text style={styles.tabLabelInactive}>{label}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.tabLayer, styles.tabLayerActive, activeStyle]}>
          {renderIcon('#fff')}
          <Text style={styles.tabLabelActive}>{label}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function PagerPage({
  index,
  width,
  progress,
  children,
}: {
  index: number;
  width: number;
  progress: SharedValue<number>;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - index);
    return {
      transform: [
        {
          scale: interpolate(distance, [0, 1], [1, 0.985], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(distance, [0, 1], [1, 0.92], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[styles.page, { width }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const leaf = typeof segments[segments.length - 1] === 'string' ? segments[segments.length - 1] : 'index';
  const currentRoute = leaf === '(tabs)' ? 'index' : leaf;
  const currentIndex = Math.max(0, ROUTES.indexOf((currentRoute as (typeof ROUTES)[number]) ?? 'index'));
  const translateX = useSharedValue(-currentIndex * width);
  const gestureStartX = useSharedValue(-currentIndex * width);

  const progress = useDerivedValue(() => {
    if (!width) return currentIndex;
    return -translateX.value / width;
  });

  const syncRoute = (target: number) => {
    const path =
      target === 0
        ? ('/(tabs)' as const)
        : target === 1
          ? ('/(tabs)/explore' as const)
          : target === 2
            ? ('/(tabs)/search' as const)
            : ('/(tabs)/profile' as const);
    router.replace(path);
  };

  const snapToIndex = (target: number, shouldSyncRoute: boolean) => {
    'worklet';
    const clampedIndex = clamp(target, 0, ROUTES.length - 1);
    translateX.value = withSpring(-clampedIndex * width, SPRING_CONFIG, finished => {
      if (finished && shouldSyncRoute) {
        runOnJS(syncRoute)(clampedIndex);
      }
    });
  };

  useEffect(() => {
    runOnUI((target: number) => {
      'worklet';
      translateX.value = withSpring(-target * width, SPRING_CONFIG);
    })(currentIndex);
  }, [currentIndex, translateX, width]);

  const pagerGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      gestureStartX.value = translateX.value;
    })
    .onUpdate(event => {
      const minTranslate = -((ROUTES.length - 1) * width);
      const nextTranslate = gestureStartX.value + event.translationX;
      translateX.value = rubberBand(nextTranslate, minTranslate, 0);
    })
    .onEnd(event => {
      const rawIndex = width ? -translateX.value / width : 0;
      let targetIndex = Math.round(rawIndex);

      if (Math.abs(event.velocityX) > 500) {
        targetIndex = event.velocityX < 0 ? Math.ceil(rawIndex) : Math.floor(rawIndex);
      }

      snapToIndex(targetIndex, true);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pagerGesture}>
        <View style={styles.pagerViewport}>
          <Animated.View style={[styles.pagerTrack, { width: width * ROUTES.length }, trackStyle]}>
            <PagerPage index={0} width={width} progress={progress}>
              <HomeScreen />
            </PagerPage>
            <PagerPage index={1} width={width} progress={progress}>
              <DiscoverScreen />
            </PagerPage>
            <PagerPage index={2} width={width} progress={progress}>
              <SearchScreen isActive={currentIndex === 2} />
            </PagerPage>
            <PagerPage index={3} width={width} progress={progress}>
              <ProfileScreen />
            </PagerPage>
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={[styles.bottomOverlay, { paddingBottom: bottomInset }]}>
        <View style={styles.dotsRow}>
          {ROUTES.map((route, index) => (
            <IndicatorDot key={`${route}-dot`} index={index} progress={progress} />
          ))}
        </View>

        <View style={styles.tabBar}>
          <TabButton
            index={0}
            label="Home"
            progress={progress}
            onPress={() => runOnUI(snapToIndex)(0, true)}
            renderIcon={color => <VinylIcon color={color} />}
          />
          <TabButton
            index={1}
            label="Discover"
            progress={progress}
            onPress={() => runOnUI(snapToIndex)(1, true)}
            renderIcon={color => <CompassIcon color={color} />}
          />
          <TabButton
            index={2}
            label="Search"
            progress={progress}
            onPress={() => runOnUI(snapToIndex)(2, true)}
            renderIcon={color => <SearchIcon color={color} />}
          />
          <TabButton
            index={3}
            label="Profile"
            progress={progress}
            onPress={() => runOnUI(snapToIndex)(3, true)}
            renderIcon={color => <ProfileIcon color={color} />}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  pagerViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  pagerTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    flex: 1,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  tabBar: {
    backgroundColor: '#0a0a0a',
    borderTopColor: '#ffffff0f',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  tabInner: {
    width: 72,
    height: 42,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLayerActive: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  tabLabelInactive: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff60',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
