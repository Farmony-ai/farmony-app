
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../../components/Text';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, FONTS, FONT_SIZES } from '../../utils';

const AdvancedSettingsScreen = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaWrapper>
      <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Advanced Settings</Text>
          <View style={{ width: 24 }} />
      </View>
      <View style={styles.container}>
        <Text>Advanced Settings</Text>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
},
headerTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT.PRIMARY,
},
});

export default AdvancedSettingsScreen;
