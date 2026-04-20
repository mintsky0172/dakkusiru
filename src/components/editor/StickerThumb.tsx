import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface StikerThumbProps {
  name: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  added?: boolean;
}

const StickerThumb = ({ name, imageSource, onPress, added = false }: StikerThumbProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        added && styles.addedCard,
      ]}
    >
      <View style={[styles.imageWrapper, added && styles.addedImageWrapper]}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} />
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

export default StickerThumb;

const styles = StyleSheet.create({
  card: {
    width: "48%",
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
  addedImageWrapper: {
    borderColor: colors.accent.main,
    backgroundColor: colors.background.surface,
  },
  image: {
    width: "76%",
    height: "76%",
    resizeMode: "contain",
    borderRadius: radius.md,
    backgroundColor: "transparent",
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
