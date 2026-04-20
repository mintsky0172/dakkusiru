import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import React from "react";
import { colors } from "../../constants/colors";
import { radius } from "../../constants/spacing";

interface SimpleBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightRatio?: number;
  contentStyle?: ViewStyle | ViewStyle[];
}

const SimpleBottomSheet = ({
  visible,
  onClose,
  children,
  heightRatio = 0.72,
  contentStyle,
}: SimpleBottomSheetProps) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { height: `${heightRatio * 100}%` },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
};

export default SimpleBottomSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay.dim,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: "hidden",
  },
});
