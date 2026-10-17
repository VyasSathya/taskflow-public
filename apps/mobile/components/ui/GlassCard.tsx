/**
 * GlassCard - Glassmorphism Card Component
 * Frosted glass effect with neon border accent
 *
 * Use for:
 * - Control panels
 * - Feature cards
 * - Modal content
 * - Premium UI sections
 *
 * Features:
 * - Frosted glass blur effect
 * - Gradient overlay
 * - Neon border glow
 * - Customizable colors
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { tokens } from '@/lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  /** Primary accent color */
  primaryColor?: string;
  /** Secondary accent color */
  secondaryColor?: string;
  /** Glow/border color */
  glowColor?: string;
  /** Blur intensity (0-100) */
  blurIntensity?: number;
  /** Border radius */
  borderRadius?: number;
  /** Padding inside the card */
  padding?: number;
  /** Show neon border effect */
  showBorder?: boolean;
  /** Additional container styles */
  style?: ViewStyle | ViewStyle[];
  /** Blur tint: light, dark, or default */
  tint?: 'light' | 'dark' | 'default';
}

export function GlassCard({
  children,
  primaryColor = '#8B5CF6',
  secondaryColor = '#FF006E',
  glowColor,
  blurIntensity = 45,
  borderRadius = tokens.borderRadius.xl,
  padding = tokens.spacing.lg,
  showBorder = true,
  style,
  tint = 'dark',
}: GlassCardProps) {
  const effectiveGlowColor = glowColor || primaryColor;

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={blurIntensity}
        tint={tint}
        style={[styles.blurContainer, { borderRadius, padding }]}
      >
        {/* Gradient overlay */}
        <LinearGradient
          colors={[
            `${primaryColor}15`,
            'rgba(255,255,255,0.05)',
            `${secondaryColor}10`,
          ]}
          style={[styles.gradientOverlay, { borderRadius }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
        />

        {/* Neon border */}
        {showBorder && (
          <View
            style={[
              styles.neonBorder,
              {
                borderRadius,
                borderColor: `${effectiveGlowColor}40`,
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Content */}
        {children}
      </BlurView>
    </View>
  );
}

/**
 * GlassPanel - Simpler glass effect without blur (better performance)
 * Use when you don't need the full blur effect
 */
export function GlassPanel({
  children,
  primaryColor = '#8B5CF6',
  glowColor,
  borderRadius = tokens.borderRadius.xl,
  padding = tokens.spacing.lg,
  showBorder = true,
  style,
}: Omit<GlassCardProps, 'blurIntensity' | 'tint' | 'secondaryColor'>) {
  const effectiveGlowColor = glowColor || primaryColor;

  return (
    <View
      style={[
        styles.panelContainer,
        {
          borderRadius,
          padding,
          shadowColor: effectiveGlowColor,
        },
        showBorder && {
          borderColor: `${effectiveGlowColor}30`,
          borderWidth: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    // Floating shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  blurContainer: {
    overflow: 'hidden',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  neonBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  panelContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    // Shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default GlassCard;
