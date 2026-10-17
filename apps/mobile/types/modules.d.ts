/**
 * Type declarations for modules that may not have their types resolved
 * due to monorepo hoisting or installation issues.
 * 
 * These declarations allow TypeScript to compile while the actual
 * implementation comes from the installed packages.
 */

// Expo modules
declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }
  
  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }
  
  export function impactAsync(style?: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type?: NotificationFeedbackType): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

declare module 'expo-linear-gradient' {
  import { ViewProps } from 'react-native';
  
  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number } | [number, number];
    end?: { x: number; y: number } | [number, number];
    locations?: number[];
  }
  
  export const LinearGradient: React.FC<LinearGradientProps>;
}

declare module 'expo-blur' {
  import { ViewProps } from 'react-native';
  
  export type BlurTint = 'light' | 'dark' | 'default' | 'extraLight' | 'regular' | 'prominent';
  
  export interface BlurViewProps extends ViewProps {
    tint?: BlurTint;
    intensity?: number;
  }
  
  export const BlurView: React.FC<BlurViewProps>;
}

declare module 'expo-crypto' {
  export enum CryptoDigestAlgorithm {
    SHA256 = 'SHA-256',
    SHA384 = 'SHA-384',
    SHA512 = 'SHA-512',
  }
  
  export function digestStringAsync(
    algorithm: CryptoDigestAlgorithm,
    data: string
  ): Promise<string>;
  
  export function getRandomBytesAsync(byteCount: number): Promise<Uint8Array>;
}

declare module 'expo-av' {
  export class Audio {
    static Sound: {
      createAsync(
        source: any,
        initialStatus?: any,
        onPlaybackStatusUpdate?: (status: any) => void
      ): Promise<{ sound: any; status: any }>;
    };
  }
}

declare module 'expo-document-picker' {
  export interface DocumentPickerResult {
    canceled: boolean;
    assets?: Array<{
      name: string;
      uri: string;
      mimeType?: string;
      size?: number;
    }>;
  }
  
  export interface DocumentPickerOptions {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }
  
  export function getDocumentAsync(options?: DocumentPickerOptions): Promise<DocumentPickerResult>;
}

declare module 'expo-image-picker' {
  export interface ImagePickerResult {
    canceled: boolean;
    assets?: Array<{
      uri: string;
      width: number;
      height: number;
      type?: string;
      fileName?: string;
      fileSize?: number;
    }>;
  }
  
  export interface ImagePickerOptions {
    mediaTypes?: string;
    allowsEditing?: boolean;
    quality?: number;
    allowsMultipleSelection?: boolean;
  }
  
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function launchCameraAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: string }>;
  export function requestCameraPermissionsAsync(): Promise<{ status: string }>;
}

declare module 'expo-image-manipulator' {
  export interface ImageResult {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }
  
  export interface Action {
    resize?: { width?: number; height?: number };
    rotate?: number;
    flip?: { vertical?: boolean; horizontal?: boolean };
    crop?: { originX: number; originY: number; width: number; height: number };
  }
  
  export interface SaveOptions {
    compress?: number;
    format?: 'jpeg' | 'png';
    base64?: boolean;
  }
  
  export function manipulateAsync(
    uri: string,
    actions: Action[],
    saveOptions?: SaveOptions
  ): Promise<ImageResult>;
}

// React Native modules
declare module 'react-native-gesture-handler' {
  import { ViewProps, Animated } from 'react-native';
  
  export interface SwipeableProps {
    friction?: number;
    leftThreshold?: number;
    rightThreshold?: number;
    overshootLeft?: boolean;
    overshootRight?: boolean;
    overshootFriction?: number;
    onSwipeableOpen?: (direction: 'left' | 'right') => void;
    onSwipeableClose?: (direction: 'left' | 'right') => void;
    onSwipeableWillOpen?: (direction: 'left' | 'right') => void;
    onSwipeableWillClose?: (direction: 'left' | 'right') => void;
    renderLeftActions?: (
      progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>
    ) => React.ReactNode;
    renderRightActions?: (
      progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>
    ) => React.ReactNode;
    children?: React.ReactNode;
  }
  
  export class Swipeable extends React.Component<SwipeableProps> {
    close(): void;
    openLeft(): void;
    openRight(): void;
  }
  
  export interface GestureHandlerRootViewProps extends ViewProps {
    children?: React.ReactNode;
  }
  
  export const GestureHandlerRootView: React.FC<GestureHandlerRootViewProps>;
  
  // Re-export for compatibility
  export * from 'react-native-gesture-handler';
}

declare module 'lottie-react-native' {
  import { ViewProps } from 'react-native';
  
  export interface LottieViewProps extends ViewProps {
    source: any;
    autoPlay?: boolean;
    loop?: boolean;
    speed?: number;
    progress?: number;
    onAnimationFinish?: () => void;
  }
  
  const LottieView: React.FC<LottieViewProps>;
  export default LottieView;
}

declare module 'react-native-svg' {
  import { ViewProps } from 'react-native';
  
  export interface SvgProps extends ViewProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
  }
  
  export interface CircleProps {
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    strokeDasharray?: string;
    strokeDashoffset?: number | string;
    transform?: string;
  }
  
  export const Svg: React.FC<SvgProps>;
  export const Circle: React.FC<CircleProps>;
  export const G: React.FC<ViewProps & { rotation?: number; origin?: string }>;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<string[]>;
    multiGet(keys: string[]): Promise<[string, string | null][]>;
    multiSet(keyValuePairs: [string, string][]): Promise<void>;
    multiRemove(keys: string[]): Promise<void>;
  };
  export default AsyncStorage;
}

declare module '@gorhom/bottom-sheet' {
  import { ViewProps } from 'react-native';
  import { SharedValue } from 'react-native-reanimated';
  
  export interface BottomSheetProps extends ViewProps {
    ref?: React.Ref<BottomSheetMethods>;
    index?: number;
    snapPoints: (string | number)[];
    enablePanDownToClose?: boolean;
    enableDynamicSizing?: boolean;
    onChange?: (index: number) => void;
    onClose?: () => void;
    backgroundStyle?: ViewProps['style'];
    handleIndicatorStyle?: ViewProps['style'];
    children?: React.ReactNode;
  }
  
  export interface BottomSheetMethods {
    snapToIndex(index: number): void;
    snapToPosition(position: number | string): void;
    expand(): void;
    collapse(): void;
    close(): void;
    forceClose(): void;
  }
  
  export interface BottomSheetModalMethods extends BottomSheetMethods {
    present(): void;
    dismiss(): void;
  }
  
  export interface BottomSheetModalProps extends BottomSheetProps {
    ref?: React.Ref<BottomSheetModalMethods>;
  }
  
  const BottomSheet: React.ForwardRefExoticComponent<BottomSheetProps & React.RefAttributes<BottomSheetMethods>>;
  export const BottomSheetModal: React.ForwardRefExoticComponent<BottomSheetModalProps & React.RefAttributes<BottomSheetModalMethods>>;
  export const BottomSheetModalProvider: React.FC<{ children: React.ReactNode }>;
  export const BottomSheetView: React.FC<ViewProps>;
  export const BottomSheetScrollView: React.FC<ViewProps>;
  export const BottomSheetFlatList: React.FC<any>;
  export const BottomSheetBackdrop: React.FC<any>;
  
  export function useBottomSheetModal(): {
    dismiss: () => void;
    dismissAll: () => void;
  };
  
  export default BottomSheet;
}

declare module 'expo-share-intent' {
  export interface ShareIntentFile {
    path: string;
    mimeType?: string;
    fileName?: string;
    size?: number;
    width?: number;
    height?: number;
    duration?: number;
  }

  export interface ShareIntentMeta {
    title?: string;
    [key: string]: string | undefined;
  }

  export interface ShareIntent {
    text?: string;
    webUrl?: string;
    files?: ShareIntentFile[];
    meta?: ShareIntentMeta;
  }

  export interface UseShareIntentOptions {
    disabled?: boolean;
    debug?: boolean;
  }

  export interface UseShareIntentResult {
    hasShareIntent: boolean;
    shareIntent: ShareIntent | null;
    resetShareIntent: () => void;
    error: string | null;
  }

  export function useShareIntent(options?: UseShareIntentOptions): UseShareIntentResult;
  export function useShareIntentContext(): UseShareIntentResult;

  export interface ShareIntentProviderProps {
    children: React.ReactNode;
    options?: UseShareIntentOptions;
  }

  export const ShareIntentProvider: React.FC<ShareIntentProviderProps>;
}
