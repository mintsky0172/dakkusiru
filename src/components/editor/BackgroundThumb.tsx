import { ImageSourcePropType, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import React from "react";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface BackgroundThumbProps {
  name: string;
  imageSource?: ImageSourcePropType;
  backgroundColor?: string;
  selected?: boolean;
  onPress?: () => void;
}

const BackgroundThumb = ({
  name,
  imageSource,
  backgroundColor,
  selected = false,
  onPress,
}: BackgroundThumbProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.imageWrapper,
          backgroundColor ? { backgroundColor } : null,
          selected && styles.selectedPreview,
        ]}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.image}
            contentFit="cover"
            cachePolicy="disk"
            transition={100}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <AppText variant="small" numberOfLines={1} style={styles.label}>
        {name}
      </AppText>
    </Pressable>
  );
};

export default BackgroundThumb;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  addedCard: {
    transform: [{ scale: 0.98 }],
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.background.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectedPreview: {
    borderColor: colors.accent.main,
    borderWidth: 2,
  },
  image: {
    width: "76%",
    height: "76%",
  },
  placeholder: {
    width: "76%",
    height: "76%",
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
  },
  label: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
