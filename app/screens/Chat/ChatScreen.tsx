import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

const PlaceholderScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { screenName } = route.params as { screenName: string };

  useEffect(() => {
    navigation.setOptions({ title: screenName });
  }, [navigation, screenName]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{screenName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Or use your theme color
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default PlaceholderScreen;
