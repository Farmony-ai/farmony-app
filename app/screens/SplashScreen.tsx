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
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }: { onFinish?: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const leafAnimation1 = useRef(new Animated.Value(0)).current;
  const leafAnimation2 = useRef(new Animated.Value(0)).current;
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const loadingFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.sequence([
      Animated.parallel([
        // Logo fade in and scale
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        // Leaf animations with delay
        Animated.timing(leafAnimation1, {
          toValue: 1,
          duration: 1200,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(leafAnimation2, {
          toValue: 1,
          duration: 1200,
          delay: 500,
          useNativeDriver: true,
        }),
      ]),
      // Loading indicator fade in
      Animated.timing(loadingFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Spinning animation for loader
    Animated.loop(
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Auto-finish after 3 seconds if callback provided
    if (onFinish) {
      const timer = setTimeout(() => {
        onFinish();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [fadeAnim, scaleAnim, leafAnimation1, leafAnimation2, spinAnimation, loadingFade, onFinish]);

  const spin = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Elegant leaf outline component
  const LeafOutline = ({ style, rotation = 0, opacity, flip = false }: any) => (
    <Animated.View 
      style={[
        style, 
        { 
          opacity,
          transform: [
            { rotate: `${rotation}deg` },
            { scaleX: flip ? -1 : 1 }
          ]
        }
      ]}
    >
      <Svg width="60" height="60" viewBox="0 0 100 100">
        <Path
          d="M50 20 Q25 35 25 55 T50 75 Q75 60 75 40 T50 20"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Path
          d="M50 75 L50 85"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );

  // Modern loading indicator
  const LoadingIndicator = () => (
    <Animated.View 
      style={[
        styles.loadingContainer,
        { 
          opacity: loadingFade,
          transform: [{ rotate: spin }]
        }
      ]}
    >
      <Svg width="40" height="40" viewBox="0 0 40 40">
        {/* Flower/asterisk shape */}
        {[...Array(8)].map((_, i) => {
          const angle = (i * 45) * Math.PI / 180;
          const x1 = 20 + Math.cos(angle) * 8;
          const y1 = 20 + Math.sin(angle) * 8;
          const x2 = 20 + Math.cos(angle) * 16;
          const y2 = 20 + Math.sin(angle) * 16;
          return (
            <React.Fragment key={i}>
              <Path
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <Circle
                cx={x2}
                cy={y2}
                r="2"
                fill="rgba(255,255,255,0.9)"
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </Animated.View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#3A5F47" />
      <LinearGradient
        colors={['#3A5F47', '#4A7C59', '#6B9E7C']}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        {/* Subtle leaf decorations */}
        <LeafOutline
          style={styles.leafTopLeft}
          rotation={-25}
          opacity={leafAnimation1}
        />
        <LeafOutline
          style={styles.leafTopRight}
          rotation={35}
          opacity={leafAnimation2}
          flip={true}
        />
        <LeafOutline
          style={styles.leafBottomLeft}
          rotation={-45}
          opacity={leafAnimation2}
        />
        <LeafOutline
          style={styles.leafBottomRight}
          rotation={25}
          opacity={leafAnimation1}
          flip={true}
        />

        {/* Main content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo Container with subtle shadow */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* App Name */}
          <Text style={styles.appName}>Farmony</Text>

          {/* Tagline with better spacing */}
          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>Connect</Text>
            <Text style={styles.taglineDot}>•</Text>
            <Text style={styles.tagline}>Share</Text>
            <Text style={styles.taglineDot}>•</Text>
            <Text style={styles.tagline}>Grow</Text>
          </View>
        </Animated.View>

        {/* Modern loading indicator */}
        <LoadingIndicator />

        {/* Bottom decoration bar */}
        <View style={styles.bottomBar} />
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoWrapper: {
    marginBottom: 30,
  },
  logoContainer: {
    width: 110,
    height: 110,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  logo: {
    width: 80,
    height: 80,
    tintColor: '#FFC947', // Brighter warm orange/yellow
  },
  appName: {
    fontSize: 32,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 2,
    fontFamily: 'Poppins-SemiBold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tagline: {
    fontSize: 17,
    color: '#E8F5E9',
    letterSpacing: 1.5,
    fontWeight: '400',
    opacity: 0.95,
    fontFamily: 'Poppins-Regular',
  },
  taglineDot: {
    fontSize: 17,
    color: '#E8F5E9',
    marginHorizontal: 12,
    opacity: 0.7,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: height * 0.12,
  },
  leafTopLeft: {
    position: 'absolute',
    top: height * 0.08,
    left: width * 0.1,
  },
  leafTopRight: {
    position: 'absolute',
    top: height * 0.1,
    right: width * 0.1,
  },
  leafBottomLeft: {
    position: 'absolute',
    bottom: height * 0.15,
    left: width * 0.08,
  },
  leafBottomRight: {
    position: 'absolute',
    bottom: height * 0.18,
    right: width * 0.08,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
})

export default SplashScreen;