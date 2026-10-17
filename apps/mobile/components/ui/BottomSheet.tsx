import React, { forwardRef, useCallback, useMemo, ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/lib/hooks';
import { tokens } from '@/lib/theme';

interface BottomSheetProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  enableDynamicSizing?: boolean;
  onClose?: () => void;
  backdrop?: boolean;
  handleComponent?: ReactNode;
  style?: ViewStyle;
}

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  (
    {
      children,
      snapPoints: customSnapPoints,
      enableDynamicSizing = false,
      onClose,
      backdrop = true,
      handleComponent,
      style,
    },
    ref
  ) => {
    const { colors } = useTheme();

    const snapPoints = useMemo(
      () => customSnapPoints || ['25%', '50%', '90%'],
      [customSnapPoints]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => {
        if (!backdrop) return null;

        return (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
          />
        );
      },
      [backdrop]
    );

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1 && onClose) {
          onClose();
        }
      },
      [onClose]
    );

    const handleIndicatorStyle = useMemo(
      () => ({
        backgroundColor: colors.textTertiary,
        width: 36,
        height: 4,
      }),
      [colors.textTertiary]
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={-1}
        snapPoints={enableDynamicSizing ? undefined : snapPoints}
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose
        onChange={handleSheetChanges}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={handleIndicatorStyle}
        backgroundStyle={[
          styles.background,
          { backgroundColor: colors.surface },
        ]}
        style={style}
      >
        {enableDynamicSizing ? (
          <BottomSheetView style={styles.content}>{children}</BottomSheetView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

// Hook for controlling the bottom sheet
export { useBottomSheet } from '@gorhom/bottom-sheet';

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: tokens.borderRadius.xl,
    borderTopRightRadius: tokens.borderRadius.xl,
  },
  content: {
    flex: 1,
    padding: tokens.spacing.md,
  },
});
