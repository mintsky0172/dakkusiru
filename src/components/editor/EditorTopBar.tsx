import { StyleSheet, View } from "react-native";
import React from "react";
import IconButton from "../common/IconButton";
import { router } from "expo-router";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useEditorStore } from "../../store/editorStore";

interface EditorTopBarProps {
  onRemove?: () => void;
  onSave?: () => void;
}

const EditorTopBar = ({ onRemove, onSave }: EditorTopBarProps) => {
  const selectedStickerId = useEditorStore((state) => state.selectedStickerId);
  const removeSelectedSticker = useEditorStore(
    (state) => state.removeSelectedSticker,
  );

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
      return;
    }

    removeSelectedSticker();
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <IconButton
          imageSource={require("../../../assets/icons/home_active.png")}
          onPress={() => router.back()}
          variant="ghost"
          size={40}
          iconSize={18}
        />
      </View>

      <View style={styles.centerGroup}>
        <IconButton
          imageSource={require("../../../assets/icons/undo.png")}
          onPress={() => {}}
          variant="ghost"
          size={40}
          iconSize={18}
        />
        <IconButton
          imageSource={require("../../../assets/icons/redo.png")}
          onPress={() => {}}
          variant="ghost"
          size={40}
          iconSize={18}
        />
        <IconButton
          imageSource={require("../../../assets/icons/text.png")}
          onPress={() => {}}
          variant="ghost"
          size={40}
          iconSize={18}
        />
        <IconButton
          imageSource={require("../../../assets/icons/trash.png")}
          onPress={handleRemove}
          variant="ghost"
          size={40}
          iconSize={18}
          disabled={!selectedStickerId}
        />
      </View>

      <View style={styles.rightGroup}>
        <IconButton
          imageSource={require("../../../assets/icons/save.png")}
          onPress={onSave}
          variant="ghost"
          size={40}
          iconSize={18}
        />
      </View>
    </View>
  );
};

export default EditorTopBar;

const styles = StyleSheet.create({
  container: {
    height: 52,
    backgroundColor: colors.background.subtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  centerGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
});
