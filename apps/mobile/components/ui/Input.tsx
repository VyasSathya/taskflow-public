import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';

type InputVariant = 'outlined' | 'filled';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: InputVariant;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helper,
      leftIcon,
      rightIcon,
      variant = 'outlined',
      containerStyle,
      secureTextEntry,
      ...props
    },
    ref
  ) => {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    const getVariantStyles = (): ViewStyle => {
      const baseStyle: ViewStyle = {
        borderRadius: tokens.borderRadius.md,
      };

      if (variant === 'outlined') {
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: error
            ? colors.error
            : isFocused
            ? colors.primary
            : colors.inputBorder,
        };
      }

      return {
        ...baseStyle,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: error
          ? colors.error
          : isFocused
          ? colors.primary
          : 'transparent',
      };
    };

    const handleToggleSecure = () => {
      setIsSecure(!isSecure);
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        )}

        <View style={[styles.inputContainer, getVariantStyles()]}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: colors.text },
              leftIcon ? styles.inputWithLeftIcon : undefined,
              (rightIcon || secureTextEntry) ? styles.inputWithRightIcon : undefined,
            ]}
            placeholderTextColor={colors.textTertiary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isSecure}
            {...props}
          />

          {secureTextEntry && (
            <TouchableOpacity
              onPress={handleToggleSecure}
              style={styles.rightIcon}
            >
              <Ionicons
                name={isSecure ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {rightIcon && !secureTextEntry && (
            <View style={styles.rightIcon}>{rightIcon}</View>
          )}
        </View>

        {(error || helper) && (
          <Text
            style={[
              styles.helperText,
              { color: error ? colors.error : colors.textSecondary },
            ]}
          >
            {error || helper}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: tokens.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: tokens.spacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  leftIcon: {
    paddingLeft: tokens.spacing.md,
  },
  rightIcon: {
    paddingRight: tokens.spacing.md,
  },
  helperText: {
    fontSize: 12,
    marginTop: tokens.spacing.xs,
  },
});
