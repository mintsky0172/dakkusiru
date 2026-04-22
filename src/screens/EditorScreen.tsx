import { Alert, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import ViewShot from "react-native-view-shot";
import { useEditorStore } from "../store/editorStore";
import { Satellite } from "lucide-react-native";
import {
  loadDakkuByIdFromLocal,
  saveDakkuToLocal,
} from "../services/localDakkuStorage";
import { router } from "expo-router";
import { saveCanvasToGallery } from "../utils/saveCanvasToGallery";
import Screen from "../components/common/Screen";
import EditorTopBar from "../components/editor/EditorTopBar";
import EditorCanvas from "../components/editor/EditorCanvas";
import FloatingToolButtons from "../components/editor/FloatingToolButtons";
import StickerPanelSheet from "../components/editor/StickerPanelSheet";
import BackgroundPanelSheet from "../components/editor/BackgroundPanelSheet";
import TextEditModal from "../components/editor/TextEditModal";
import { CanvasText } from "../types/editor";

interface EditorScreenProps {
  mode: "new" | "edit";
  dakkuId?: string;
}

function createDakkuId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const EditorScreen = ({ mode, dakkuId }: EditorScreenProps) => {
  const [isStickerSheetVisible, setIsStickerSheetVisible] = useState(false);
  const [isBackgroundSheetVisible, setIsBackgroundSheetVisible] =
    useState(false);
  const [isTextEditModalVisible, setIsTextEditModalVisible] = useState(false);
  const [currentDakkuId, setCurrentDakkuId] = useState<string>(
    dakkuId ?? createDakkuId(),
  );
  const [title, setTitle] = useState("새 다꾸");

  const canvasRef = useRef<ViewShot>(null);

  const background = useEditorStore((state) => state.background);
  const objects = useEditorStore((state) => state.objects);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);

  const addSticker = useEditorStore((state) => state.addSticker);
  const addText = useEditorStore((state) => state.addText);
  const updateTextContent = useEditorStore((state) => state.updateTextContent);
  const setBackground = useEditorStore((state) => state.setBackground);
  const removeSelectedObject = useEditorStore(
    (state) => state.removeSelectedObject,
  );
  const setEditorData = useEditorStore((state) => state.setEditorData);
  const resetEditor = useEditorStore((state) => state.resetEditor);

  const selectedTextObject = objects.find(
    (item): item is CanvasText =>
      item.id === selectedObjectId && item.type === "text",
  );

  useEffect(() => {
    async function initializeEditor() {
      if (mode === "new") {
        resetEditor();
        setCurrentDakkuId(createDakkuId());
        setTitle("새 다꾸");
        return;
      }

      if (!dakkuId) return;

      const savedDakku = await loadDakkuByIdFromLocal(dakkuId);

      if (!savedDakku) {
        Alert.alert("불러오기 실패", "저장된 다꾸를 찾을 수 없어요.", [
          {
            text: "확인",
            onPress: () => router.back(),
          },
        ]);
        return;
      }

      setCurrentDakkuId(savedDakku.id);
      setTitle(savedDakku.title);
      setEditorData({
        background: savedDakku.background,
        objects: savedDakku.objects,
      });
    }
    initializeEditor();
  }, [mode, dakkuId, resetEditor, setEditorData]);

  const handleSaveImageToGallery = async () => {
    try {
      const uri = await canvasRef.current?.capture?.();

      if (!uri) {
        throw new Error("캔버스 이미지를 생성하지 못했어요.");
      }

      await saveCanvasToGallery(uri);
      Alert.alert("저장 완료", "사진 앱에 이미지가 저장되었어요.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "이미지를 저장하는 중 오류가 발생했어요.";

      Alert.alert("저장 실패", message);
    }
  };

  const handleSaveDakkuLocally = async () => {
    try {
      let thumbnailUri: string | undefined;

      try {
        thumbnailUri = await canvasRef.current?.capture?.();
      } catch {
        thumbnailUri = undefined;
      }

      await saveDakkuToLocal({
        id: currentDakkuId,
        title,
        background,
        objects,
        thumbnailUri,
      });

      Alert.alert("저장 완료", "내 다꾸에 저장되었어요.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "다꾸를 저장하는 중 오류가 발생했어요.";

      Alert.alert("저장 실패", message);
    }
  };

  const handleOpenTextEditor = () => {
    if (!selectedTextObject) {
      Alert.alert("텍스트 선택", "먼저 텍스트 박스를 선택해 주세요.");
      return;
    }

    setIsTextEditModalVisible(true);
  };

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        <EditorTopBar
          onSave={handleSaveImageToGallery}
          onAddText={addText}
          onEditText={handleOpenTextEditor}
          onSaveDakku={handleSaveDakkuLocally}
        />

        <View style={styles.canvasArea}>
          <EditorCanvas ref={canvasRef} />

          <FloatingToolButtons
            onPressBackground={() => setIsBackgroundSheetVisible(true)}
            onPressSticker={() => setIsStickerSheetVisible(true)}
          />
        </View>

        <StickerPanelSheet
          visible={isStickerSheetVisible}
          onClose={() => setIsStickerSheetVisible(false)}
          onSelectSticker={({ stickerId, imageSource }) => {
            addSticker({ stickerId, imageSource });
          }}
        />

        <BackgroundPanelSheet
          visible={isBackgroundSheetVisible}
          onClose={() => setIsBackgroundSheetVisible(false)}
          selectedBackgroundId={background?.id ?? null}
          onSelectBackground={(item) => {
            setBackground({
              id: item.id,
              imageSource: item.imageSource,
              backgroundColor: item.backgroundColor,
            });
          }}
        />

        <TextEditModal
          visible={isTextEditModalVisible}
          initialValue={selectedTextObject?.text ?? ""}
          onClose={() => setIsTextEditModalVisible(false)}
          onConfirm={(value) => {
            if (selectedTextObject) {
              updateTextContent(selectedTextObject.id, value);
            }
            setIsTextEditModalVisible(false);
          }}
        />
      </View>
    </Screen>
  );
};

export default EditorScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    canvasArea: {
        flex: 1
    }
});
