import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import React from "react";
import { CanvasSticker } from "../../types/editor";
import { colors } from "../../constants/colors";

interface StickerItemProps {
  item: CanvasSticker;
  selected?: boolean;
  onPress?: () => void;
}

const StickerItem = ({ item, selected = false, onPress }: StickerItemProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wrapper,
        {
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex,
        },
      ]}
    >
      {item.imageSource ? (
        <Image source={item.imageSource} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}

      {selected ? (
        <View pointerEvents="none" style={styles.selectedBorder} />
      ) : null}
    </Pressable>
  );
};

export default StickerItem;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#eee",
  },
  selectedBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.accent.main,
    borderStyle: "dashed",
    borderRadius: 8,
  },
});
