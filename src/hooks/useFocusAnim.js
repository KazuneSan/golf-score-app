// Tab-screen focus animation: fade + slide up on focus.
// Used by Home / Practice / Analytics to give visual feedback on tab switch.
import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function useFocusAnim() {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;

  useFocusEffect(
    useCallback(() => {
      fade.setValue(0);
      slide.setValue(14);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 320, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]).start();
    }, [fade, slide])
  );

  return {
    opacity: fade,
    transform: [{ translateY: slide }],
  };
}
