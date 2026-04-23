import { StyleSheet, View } from "react-native";
import React from "react";
import IconButton from "../common/IconButton";
import { router } from "expo-router";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { useEditorStore } from "../../store/editorStore";

interface EditorTopBarProps {
  onSave?: () => void; // 사진 앱 저장
  onSaveDakku?: () => void; // 앱 내부 저장
  onAddText?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
}

const EditorTopBar = ({
  onSave,
  onSaveDakku,
  onAddText,
  onBringForward,
  onSendBackward
}: EditorTopBarProps) => {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.historyPast.length > 0);
  const canRedo = useEditorStore((state) => state.historyFuture.length > 0);

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
          onPress={canUndo ? undo : undefined}
          variant="ghost"
          size={40}
          iconSize={18}
          disabled={!canUndo}
        />
        <IconButton
          imageSource={require("../../../assets/icons/redo.png")}
          onPress={canRedo ? redo : undefined}
          variant="ghost"
          size={40}
          iconSize={18}
          disabled={!canRedo}
        />
        <IconButton
          imageSource={require("../../../assets/icons/text.png")}
          onPress={onAddText}
          variant="ghost"
          size={40}
          iconSize={18}
        />
        <IconButton
          imageSource={require("../../../assets/icons/forward.png")}
          onPress={onBringForward}
          variant="ghost"
          size={40}
          iconSize={18}
        />
        <IconButton
          imageSource={require("../../../assets/icons/backward.png")}
          onPress={onSendBackward}
          variant="ghost"
          size={40}
          iconSize={18}
        />
      </View>

      <View style={styles.rightGroup}>
        <IconButton
          imageSource={require("../../../assets/icons/save2.png")}
          onPress={onSaveDakku}
          variant="ghost"
          size={40}
          iconSize={18}
        />
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
