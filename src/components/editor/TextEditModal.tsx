import { Pressable, StyleSheet, Modal, TextInput, View } from "react-native";
import React, { useEffect, useState } from "react";;
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import AppButton from "../common/AppButton";
import { radius, spacing } from "../../constants/spacing";

interface TextEditModalProps {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

const TextEditModal = ({
  visible,
  initialValue,
  onClose,
  onConfirm,
}: TextEditModalProps) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [initialValue, visible]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    onConfirm(trimmed.length > 0 ? trimmed : "텍스트 입력");
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
          <AppText variant="h3">텍스트 수정</AppText>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="텍스트를 입력하세요"
            placeholderTextColor={colors.text.muted}
            multiline
            style={styles.input}
          />

          <View style={styles.buttonRow}>
            <View style={styles.button}>
              <AppButton label="취소" onPress={onClose} variant="secondary" />
            </View>
            <View style={styles.button}>
              <AppButton
                label="저장"
                onPress={handleConfirm}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TextEditModal;

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
    padding: spacing.xl,
  },
  input: {
    minHeight: 120,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
    fontFamily: "Iseoyun",
    fontSize: 16,
    textAlignVertical: "top",
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
