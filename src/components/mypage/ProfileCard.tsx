import { ImageSourcePropType, StyleSheet, Image, View } from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import AppButton from "../common/AppButton";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface ProfileCardProps {
  name: string;
  description: string;
  subDescription?: string;
  imageSource?: ImageSourcePropType;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onPressAction?: () => void;
  onPressSecondaryAction?: () => void;
}

const ProfileCard = ({
  name,
  description,
  subDescription,
  imageSource,
  actionLabel,
  secondaryActionLabel,
  onPressAction,
  onPressSecondaryAction
}: ProfileCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrapper}>
          {imageSource ? (
            <Image source={imageSource} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </View>

        <View style={styles.textBlock}>
          <AppText variant="h3">{name}</AppText>
          <AppText variant="caption" style={styles.description}>
            {description}
          </AppText>
          {subDescription ? (
            <AppText variant='small' style={styles.subDescription}>
                {subDescription}
            </AppText>
          ) : null}  
        </View>
      </View>

      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
            {actionLabel ? (
                <View style={styles.actionButton}>
                    <AppButton
                        label={actionLabel}
                        onPress={onPressAction}
                        variant='secondary'
                    />
                </View>
            ): null}

            {secondaryActionLabel ? (
                <View style={styles.actionButton}>
                    <AppButton
                        label={secondaryActionLabel}
                        onPress={onPressSecondaryAction}
                        variant='ghost'
                    />
                </View>
            ): null}
        </View>
      ) }
    </View>
  );
};

export default ProfileCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.round,
    overflow: 'hidden',
    backgroundColor: colors.background.subtle,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: colors.background.subtle
  },
  textBlock: {
    flex: 1,
  },
  description: {
    marginTop: 4,
  },
  subDescription: {
    marginTop: 2,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%' 
  }
  
});
