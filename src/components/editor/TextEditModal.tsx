import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
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
  const valueRef = useRef(initialValue);
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    if (visible) {
      valueRef.current = initialValue;
      setInputKey((prev) => prev + 1);
    }
  }, [initialValue, visible]);

  const handleConfirm = () => {
    const trimmed = valueRef.current.trim();
    onConfirm(trimmed.length > 0 ? trimmed : "텍스트 입력");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          <AppText variant="h3">텍스트 수정</AppText>

          <TextInput
            key={inputKey}
            defaultValue={initialValue}
            onChangeText={(nextValue) => {
              valueRef.current = nextValue;
            }}
            placeholder="텍스트를 입력하세요"
            placeholderTextColor={colors.text.muted}
            multiline
            autoCorrect={false}
            spellCheck={false}
            underlineColorAndroid="transparent"
            style={styles.input}
            autoFocus
            scrollEnabled
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default TextEditModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay.dim,
    justifyContent: "flex-start",
    paddingTop: spacing.xxxl * 2,
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
    lineHeight: 22,
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
