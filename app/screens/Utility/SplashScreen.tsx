import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import { COLORS, FONTS } from '../../utils';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }: { onFinish?: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animations
    Animated.sequence([
      // Initial delay
      Animated.delay(200),
      // Fade in and scale up logo and text together
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 10,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Auto-finish after 2.5 seconds if callback provided
    if (onFinish) {
      const timer = setTimeout(() => {
        // Fade out before finishing
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* App Name */}
          <Text style={styles.appName}>farmony</Text>
        </Animated.View>

        {/* Optional: Subtle loading indicator at bottom */}
        <Animated.View 
          style={[
            styles.loadingContainer,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.loadingDot} />
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    tintColor: '#4CAF50', // Green color for the clover
  },
  appName: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: height * 0.1,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
});

export default SplashScreen;