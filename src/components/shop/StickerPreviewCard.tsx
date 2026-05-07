import {
  ImageSourcePropType,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import React, { useRef } from "react";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

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
  const startedAtRef = useRef<number | null>(null);

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
            onLoadStart={() => {
              startedAtRef.current = Date.now();
              console.log("[preview load start]");
            }}
            onLoad={() => {
              const elapsed = startedAtRef.current
                ? Date.now() - startedAtRef.current
                : 0;

              console.log("[preview loaded]",id, elapsed);
            }}
            onError={(error) => {
              console.log("[preview error]", error);
            }}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
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
