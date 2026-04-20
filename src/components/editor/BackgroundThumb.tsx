import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Image,
  View,
} from "react-native";
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
          styles.preview,
          backgroundColor ? { backgroundColor } : null,
          selected && styles.selectedPreview,
        ]}
      >
        {imageSource ? (
          <Image source={imageSource} style={styles.image} />
        ) : null}
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
    width: "31.5%",
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  preview: {
    width: "100%",
    aspectRatio: 1.18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.surface,
    overflow: "hidden",
  },
  selectedPreview: {
    borderColor: colors.accent.main,
    borderWidth: 2,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  label: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
