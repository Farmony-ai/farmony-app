import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface RippleAnimationProps {
  color?: string;
  size?: number;
  duration?: number;
}

const RippleAnimation: React.FC<RippleAnimationProps> = ({
  color = '#3B82F6',
  size = 30,
  duration = 2000,
}) => {
  const animations = useRef([
    {
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
    },
    {
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
    },
    {
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
    },
  ]).current;

  useEffect(() => {
    const animationLoop = animations.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * (duration / 3)),
          Animated.parallel([
            Animated.timing(anim.scale, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(anim.scale, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    animationLoop.forEach(animation => animation.start());

    return () => {
      animationLoop.forEach(animation => animation.stop());
    };
  }, [animations, duration]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.ripple,
            {
              backgroundColor: 'transparent',
              borderColor: color,
              transform: [
                {
                  scale: anim.scale.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 2.6],
                  }),
                },
              ],
              opacity: anim.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  ripple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
  },
});

export default RippleAnimation;
