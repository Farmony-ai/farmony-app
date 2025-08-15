import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

// Minimal, generic bookings screen for bottom tab (not the Provider-specific one)
const BookingsScreen = () => {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      {/* Header */}
      <View style={styles.header}>
      <Text variant="h4" weight="semibold" style={styles.headerTitle}>
          Bookings
        </Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Provider')}> 
          <Ionicons name="briefcase-outline" size={20} color={COLORS.PRIMARY.MAIN} />
        </TouchableOpacity>
      </View>

      {/* Empty State / Placeholder List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY.MAIN]} />}
      >
        <View style={styles.card}>
          <View style={styles.iconBadge}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.PRIMARY.MAIN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="semibold">No bookings yet</Text>
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>Your recent bookings will appear here.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  headerTitle: {
    color: COLORS.TEXT.PRIMARY,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    alignItems: 'center',
    ...SHADOWS.SM,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BookingsScreen;


