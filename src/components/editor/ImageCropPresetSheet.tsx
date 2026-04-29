import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { CropPreset } from "../../types/imageCrop";
import SimpleBottomSheet from "../common/SimpleBottomSheet";
import BottomSheetHeader from "../common/BottomSheetHeader";
import { imageCropPresets } from "../../constants/imageCropPresets";
import AppButton from "../common/AppButton";
import { spacing } from "../../constants/spacing";

interface ImageCropPresetSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectPreset: (preset: CropPreset) => void;
}

const ImageCropPresetSheet = ({
  visible,
  onClose,
  onSelectPreset,
}: ImageCropPresetSheetProps) => {
  return (
    <SimpleBottomSheet visible={visible} onClose={onClose} heightRatio={0.42}>
      <View style={styles.container}>
        <BottomSheetHeader title="사진 자르기 비율 선택" />

        <View style={styles.buttonList}>
          {imageCropPresets.map((preset) => (
            <AppButton
              key={preset.key}
              label={preset.label}
              variant="secondary"
              onPress={() => onSelectPreset(preset)}
            />
          ))}
        </View>
      </View>
    </SimpleBottomSheet>
  );
};

export default ImageCropPresetSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  buttonList: {
    gap: spacing.sm,
  },
});
