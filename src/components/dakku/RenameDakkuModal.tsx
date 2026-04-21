import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import AppButton from "../common/AppButton";
import { radius, spacing } from "../../constants/spacing";

interface RenameDakkuModalProps {
  visible: boolean;
  initialTitle: string;
  onClose: () => void;
  onConfirm: (title: string) => void;
}

const RenameDakkuModal = ({
  visible,
  initialTitle,
  onClose,
  onConfirm,
}: RenameDakkuModalProps) => {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
    }
  }, [initialTitle, visible]);

  const handleConfirm = () => {
    const trimmed = title.trim();
    onConfirm(trimmed.length > 0 ? trimmed : "새 다꾸");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          <AppText variant="h3">이름 변경</AppText>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="다꾸 이름"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            autoFocus
          />

          <View style={styles.buttonRow}>
            <View style={styles.button}>
              <AppButton label="취소" variant="secondary" onPress={onClose} />
            </View>
            <View style={styles.button}>
              <AppButton label="저장" onPress={handleConfirm} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RenameDakkuModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dim,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  input: {
    marginTop: spacing.md,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
    fontFamily: "Iseoyun",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
  },
});
