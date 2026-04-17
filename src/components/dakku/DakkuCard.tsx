import { ImageSourcePropType, Pressable, StyleSheet, View, Image } from "react-native";
import React from "react";
import { MoreHorizontal } from "lucide-react-native";
import IconButton from "../common/IconButton";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";
import { theme } from "../../constants/theme";

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
        <View style={styles.createCardSizer}>
          <View style={styles.thumbnailWrapper} />
          <View style={styles.createMetaSpacer} />
        </View>

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
          icon={<MoreHorizontal size={16} color='#d9d9d9' />}
          onPress={onMenuPress}
          variant="ghost"
          size={32}
          style={styles.menuButton}
        />
      </View>
    </Pressable>
  );
};

export default DakkuCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: theme.card.dakkuHeight,
    backgroundColor: colors.background.base,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.9,
  },
  thumbnailWrapper: {
    width: "100%",
    height: theme.card.dakkuThumbnailHeight,
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
    alignSelf: "stretch",
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  menuButton: {
    marginLeft: "auto",
    marginRight: -spacing.xs,
  },
  dateText: {
    marginTop: 2,
  },
  createCard: {
    position: "relative",
    backgroundColor: "#FDF0DD",
  },
  createCardSizer: {
    opacity: 0,
  },
  createContent: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  createMetaSpacer: {
    marginTop: spacing.sm,
    flex: 1,
  },
});
