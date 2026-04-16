import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import React from "react";
import IconButton from "../common/IconButton";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface DakkuCardProps {
  title?: string;
  dateLabel?: string;
  thumbnailSource?: ImageSourcePropType;
  onPress?: () => void;
  onMenuPress?: () => void;
  isCreateCard?: boolean;
  createLabel?: string;
  createIconSource?: ImageSourcePropType;
}

const DakkuCard = ({
  title,
  dateLabel,
  thumbnailSource,
  onPress,
  onMenuPress,
  isCreateCard = false,
  createLabel = "새 다꾸",
  createIconSource,
}: DakkuCardProps) => {
  if (isCreateCard) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          styles.createCard,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.createContent}>
          <IconButton
            imageSource={createIconSource}
            variant="filled"
            size={52}
            iconSize={22}
            disabled
            style={styles.createIconButton}
          />
          <AppText variant="title" style={styles.createLabel}>
            {createLabel}
          </AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.thumbnailWrapper}>
        {thumbnailSource ? (
          <Image source={thumbnailSource} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.textBlock}>
          <AppText variant="title" numberOfLines={1}>
            {title ?? "무제"}
          </AppText>
          {!!dateLabel && (
            <AppText variant="small" style={styles.dateText}>
              {dateLabel}
            </AppText>
          )}
        </View>

        <IconButton
          imageSource={require("@/assets/icons/more.png")}
          onPress={onMenuPress}
          variant="ghost"
          size={32}
          iconSize={16}
        />
      </View>
    </Pressable>
  );
};

export default DakkuCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.sm,
    minHeight: 210,
  },
  pressed: {
    opacity: 0.9,
  },
  thumbnailWrapper: {
    width: "100%",
    aspectRatio: 0.78,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.background.subtle,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: colors.background.subtle,
  },
  metaRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  textBlock: {
    flex: 1,
  },
  dateText: {
    marginTop: 2,
  },
  createCard: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDF0DD",
  },
  createContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  createIconButton: {
    backgroundColor: colors.accent.soft,
  },
  createLabel: {
    marginTop: spacing.sm,
    color: colors.text.primary,
  },
});
