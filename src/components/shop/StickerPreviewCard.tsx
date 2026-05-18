import {
  ImageSourcePropType,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import React from "react";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

const WATERMARK_STRIPE_COUNT = 12;

interface StickerPreviewCardProps {
  id: string;
  name: string;
  imageSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
}

const StickerPreviewCard = ({
  id,
  name,
  imageSource,
  style,
}: StickerPreviewCardProps) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.imageWrapper}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
            recyclingKey={id}
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        <View pointerEvents="none" style={styles.watermarkOverlay}>
          {Array.from({ length: WATERMARK_STRIPE_COUNT }).map((_, index) => (
            <View
              key={index}
              style={[styles.watermarkStripe, { top: `${index * 10 - 10}%` }]}
            />
          ))}
        </View>
      </View>

      <AppText variant="caption" numberOfLines={1} style={styles.label}>
        {name}
      </AppText>
    </View>
  );
};

export default StickerPreviewCard;

const styles = StyleSheet.create({
  card: {
    width: "31%",
    marginBottom: spacing.md,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.background.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  watermarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  watermarkStripe: {
    position: "absolute",
    left: "-28%",
    width: "156%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    transform: [{ rotate: "-28deg" }],
  },
  image: {
    width: "78%",
    height: "78%",
  },
  placeholder: {
    width: "78%",
    height: "78%",
    borderRadius: radius.md,
    backgroundColor: colors.background.subtle,
  },
  label: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
