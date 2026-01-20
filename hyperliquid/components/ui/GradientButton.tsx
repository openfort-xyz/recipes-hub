import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
}

export const GradientButton: React.FC<GradientButtonProps> = ({ 
  title, 
  onPress, 
  disabled,
  variant = 'primary'
}) => {
  const getColors = (): readonly [string, string] => {
    if (disabled) return ['#4A5568', '#2D3748'] as const;

    switch (variant) {
      case 'danger':
        return ['#EF4444', '#DC2626'] as const;
      case 'primary':
      default:
        return ['#00D4AA', '#00B894'] as const;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <LinearGradient
        colors={getColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradientButton, 
          disabled && styles.gradientButtonDisabled,
          variant === 'danger' && !disabled && styles.gradientButtonDanger
        ]}
      >
        <Text style={styles.gradientButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradientButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  gradientButtonDanger: {
    shadowColor: '#EF4444',
  },
  gradientButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 
