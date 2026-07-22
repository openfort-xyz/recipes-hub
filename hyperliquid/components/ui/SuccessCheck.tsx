import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors } from './theme';

// Big checkmark + a success haptic, fired once when the success screen mounts.
export const SuccessCheck: React.FC = () => {
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={styles.circle}>
      <View style={styles.checkmark} />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  checkmark: {
    width: 28,
    height: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: colors.accent,
    transform: [{ rotate: '-45deg' }, { translateY: -3 }],
  },
});
