import { Modal, StyleSheet, Pressable, View } from "react-native";
import React from "react";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface DakkuActionMocalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const DakkuActionModal = ({
  visible,
  title,
  onClose,
  onRename,
  onDelete,
}: DakkuActionMocalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <AppText variant="title" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            onPress={onRename}
          >
            <AppText variant="body">이름 변경</AppText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            onPress={onDelete}
          >
            <AppText variant="body" style={styles.dangerText}>
              삭제
            </AppText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
            onPress={onClose}
          >
            <AppText variant="bodyStrong">취소</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default DakkuActionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dim,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.md,
  },
  menuRow: {
    minHeight: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pressed: {
    opacity: 0.75,
  },
  dangerText: {
    color: colors.state.danger,
  },
  cancelButton: {
    minHeight: 48,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
});
