import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

interface StickerPreviewCardProps {
  name: string;
  imageSource?: ImageSourcePropType;
}

const StickerPreviewCard = ({ name, imageSource }: StickerPreviewCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} />
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
    resizeMode: "contain",
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
