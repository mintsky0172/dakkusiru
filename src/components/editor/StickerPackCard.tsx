import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import React from "react";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface StickerPackCardProps {
  title: string;
  thumbnailSource?: ImageSourcePropType;
  onPress?: () => void;
}

const StickerPackCard = ({
  title,
  thumbnailSource,
  onPress,
}: StickerPackCardProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrapper}>
        {thumbnailSource ? (
          <Image
            source={thumbnailSource}
            style={styles.image}
            contentFit="contain"
            cachePolicy="disk"
            transition={120}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      <AppText variant="title" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
    </Pressable>
  );
};

export default StickerPackCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1.08,
    backgroundColor: colors.background.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "84%",
    height: "84%",
  },
  placeholder: {
    width: "84%",
    height: "84%",
    borderRadius: radius.md,
    backgroundColor: colors.background.surface,
  },
  title: {
    marginTop: spacing.xs,
  },
});
