import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Text from '../../components/Text';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SPACING, FONTS } from '../../utils';

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
          <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy-outline" size={32} color={COLORS_MINIMAL.accent} />
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
                    <Ionicons name={item.icon} size={20} color={COLORS_MINIMAL.text.secondary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
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
                  <Ionicons name={topic.icon} size={18} color={COLORS_MINIMAL.accent} />
                </View>
                <Text style={styles.topicText}>{topic.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.emergencySection}>
          <View style={styles.emergencyCard}>
            <Ionicons name="warning-outline" size={20} color={COLORS_MINIMAL.accent} />
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 18,
    color: COLORS_MINIMAL.text.primary,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS_MINIMAL.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 20,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 14,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchPlaceholder: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 15,
    color: COLORS_MINIMAL.text.muted,
    marginLeft: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 14,
    color: COLORS_MINIMAL.text.muted,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 15,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 2,
  },
  itemSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 13,
    color: COLORS_MINIMAL.text.muted,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
    marginLeft: 52,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  topicCard: {
    width: '47%',
    backgroundColor: COLORS_MINIMAL.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS_MINIMAL.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  topicText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 13,
    color: COLORS_MINIMAL.text.primary,
    flex: 1,
  },
  emergencySection: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  emergencyCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS_MINIMAL.accent}10`,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emergencyContent: {
    marginLeft: 12,
    flex: 1,
  },
  emergencyTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 14,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 2,
  },
  emergencyText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 13,
    color: COLORS_MINIMAL.text.secondary,
  },
});

export default HelpScreen;