import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Text from '../../components/Text';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SPACING, FONTS } from '../../utils';
import { scaleFontSize, scaleSize } from '../../utils/fonts';

// Ultra-minimal color scheme
const COLORS_MINIMAL = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: {
    primary: '#000000',
    secondary: '#4A5568',
    muted: '#A0AEC0',
  },
  accent: '#10B981',
  border: '#E2E8F0',
  divider: '#F1F5F9',
};

const HelpScreen = () => {
  const navigation = useNavigation();

  const helpItems = [
    { 
      icon: 'help-circle-outline', 
      title: 'FAQs', 
      subtitle: 'Frequently asked questions',
      onPress: () => {} 
    },
    { 
      icon: 'chatbubbles-outline', 
      title: 'Contact Support', 
      subtitle: 'Get help from our team',
      onPress: () => {} 
    },
    { 
      icon: 'call-outline', 
      title: 'Call Us', 
      subtitle: '+91 98765 43210',
      onPress: () => {} 
    },
    { 
      icon: 'mail-outline', 
      title: 'Email Us', 
      subtitle: 'support@farmrent.com',
      onPress: () => {} 
    },
  ];

  const quickHelp = [
    { title: 'How to book equipment?', icon: 'bookmark-outline' },
    { title: 'Payment methods', icon: 'card-outline' },
    { title: 'Cancellation policy', icon: 'close-circle-outline' },
    { title: 'Service areas', icon: 'location-outline' },
  ];

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={scaleSize(24)} color={COLORS_MINIMAL.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: scaleSize(24) }} />
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy-outline" size={scaleSize(32)} color={COLORS_MINIMAL.accent} />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSubtitle}>Find answers or contact our support team</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.card}>
            {helpItems.map((item, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={styles.helpItem}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={scaleSize(20)} color={COLORS_MINIMAL.text.secondary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={scaleSize(18)} color={COLORS_MINIMAL.text.muted} />
                </TouchableOpacity>
                {index < helpItems.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Topics</Text>
          <View style={styles.topicsGrid}>
            {quickHelp.map((topic, index) => (
              <TouchableOpacity
                key={index}
                style={styles.topicCard}
                activeOpacity={0.7}
              >
                <View style={styles.topicIcon}>
                  <Ionicons name={topic.icon} size={scaleSize(18)} color={COLORS_MINIMAL.accent} />
                </View>
                <Text style={styles.topicText}>{topic.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.emergencySection}>
          <View style={styles.emergencyCard}>
            <Ionicons name="warning-outline" size={scaleSize(20)} color={COLORS_MINIMAL.accent} />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>Need urgent help?</Text>
              <Text style={styles.emergencyText}>Our support team is available 24/7</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_MINIMAL.background,
  },
  contentContainer: {
    paddingBottom: scaleSize(100),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleSize(20),
    paddingVertical: scaleSize(16),
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: scaleFontSize(18),
    color: COLORS_MINIMAL.text.primary,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: scaleSize(32),
    paddingHorizontal: scaleSize(20),
  },
  heroIcon: {
    width: scaleSize(64),
    height: scaleSize(64),
    borderRadius: scaleSize(32),
    backgroundColor: `${COLORS_MINIMAL.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleSize(16),
  },
  heroTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: scaleFontSize(20),
    color: COLORS_MINIMAL.text.primary,
    marginBottom: scaleSize(8),
  },
  heroSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: scaleFontSize(14),
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    marginHorizontal: scaleSize(20),
    marginBottom: scaleSize(24),
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(12),
  },
  searchPlaceholder: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: scaleFontSize(15),
    color: COLORS_MINIMAL.text.muted,
    marginLeft: scaleSize(10),
  },
  section: {
    marginBottom: scaleSize(24),
  },
  sectionTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(14),
    color: COLORS_MINIMAL.text.muted,
    marginBottom: scaleSize(8),
    paddingHorizontal: scaleSize(20),
  },
  card: {
    marginHorizontal: scaleSize(20),
    borderRadius: scaleSize(12),
    overflow: 'hidden',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSize(14),
    paddingHorizontal: scaleSize(4),
  },
  iconContainer: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: scaleSize(10),
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSize(12),
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(15),
    color: COLORS_MINIMAL.text.primary,
    marginBottom: scaleSize(2),
  },
  itemSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: scaleFontSize(13),
    color: COLORS_MINIMAL.text.muted,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
    marginLeft: scaleSize(52),
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scaleSize(20),
    gap: scaleSize(12),
  },
  topicCard: {
    width: '47%',
    backgroundColor: COLORS_MINIMAL.surface,
    padding: scaleSize(16),
    borderRadius: scaleSize(12),
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicIcon: {
    width: scaleSize(32),
    height: scaleSize(32),
    borderRadius: scaleSize(8),
    backgroundColor: COLORS_MINIMAL.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSize(10),
  },
  topicText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(13),
    color: COLORS_MINIMAL.text.primary,
    flex: 1,
  },
  emergencySection: {
    paddingHorizontal: scaleSize(20),
    marginTop: scaleSize(8),
    marginBottom: scaleSize(24),
  },
  emergencyCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS_MINIMAL.accent}10`,
    padding: scaleSize(16),
    borderRadius: scaleSize(12),
    alignItems: 'center',
  },
  emergencyContent: {
    marginLeft: scaleSize(12),
    flex: 1,
  },
  emergencyTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: scaleFontSize(14),
    color: COLORS_MINIMAL.text.primary,
    marginBottom: scaleSize(2),
  },
  emergencyText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: scaleFontSize(13),
    color: COLORS_MINIMAL.text.secondary,
  },
});

export default HelpScreen;