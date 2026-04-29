import {
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CanvasPhoto } from "../../types/editor";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";
import { AppText } from "../common/AppText";
import AppButton from "../common/AppButton";
import { imageCropPresets } from "../../constants/imageCropPresets";
import { CropPresetKey } from "../../types/imageCrop";

interface PhotoCropModalProps {
  visible: boolean;
  photo: CanvasPhoto | null;
  onClose: () => void;
  onConfirm: (payload: {
    cropOffsetX: number;
    cropOffsetY: number;
    photoZoom: number;
    width: number;
    height: number;
  }) => void;
}

type ResizeHandle = "left" | "right" | "top" | "bottom";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;
const MIN_FRAME_SIZE = 32;
const MIN_PREVIEW_FRAME_SIZE = 72;

const getPresetKeyFromRatio = (ratio: number): CropPresetKey => {
  const presets = [
    { key: "square" as const, ratio: 1 },
    { key: "threeFour" as const, ratio: 3 / 4 },
    { key: "nineSixteen" as const, ratio: 9 / 16 },
  ];

  const closestPreset = presets.reduce((best, current) => {
    const bestDiff = Math.abs(best.ratio - ratio);
    const currentDiff = Math.abs(current.ratio - ratio);
    return currentDiff < bestDiff ? current : best;
  });

  return Math.abs(closestPreset.ratio - ratio) < 0.04
    ? closestPreset.key
    : "free";
};

const clampFrameSize = (
  width: number,
  height: number,
  maxWidth = Number.POSITIVE_INFINITY,
  maxHeight = Number.POSITIVE_INFINITY,
) => ({
  width: Math.min(maxWidth, Math.max(MIN_FRAME_SIZE, Math.round(width))),
  height: Math.min(maxHeight, Math.max(MIN_FRAME_SIZE, Math.round(height))),
});

const PhotoCropModal = ({
  visible,
  photo,
  onClose,
  onConfirm,
}: PhotoCropModalProps) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gestureModeRef = useRef<"none" | "pan" | "pinch">("none");
  const panStartOffsetRef = useRef({ x: 0, y: 0 });
  const panStartPointerRef = useRef<{ pageX: number; pageY: number } | null>(
    null,
  );
  const pinchStartOffsetRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(0);
  const pinchStartZoomRef = useRef(MIN_ZOOM);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{
    width: number;
    height: number;
    pageX: number;
    pageY: number;
    previewScale: number;
    frameCenterOffsetX: number;
    frameCenterOffsetY: number;
    cropOffsetX: number;
    cropOffsetY: number;
    zoom: number;
  } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [frameCenterOffset, setFrameCenterOffset] = useState({ x: 0, y: 0 });
  const [previewScale, setPreviewScale] = useState(1);
  const [selectedPresetKey, setSelectedPresetKey] =
    useState<CropPresetKey>("free");
  const [frameSize, setFrameSize] = useState({
    width: 180,
    height: 180,
  });
  const canvasWidth = Math.max(260, Math.min(windowWidth - spacing.lg * 2, 460));
  const canvasHeight = Math.max(
    320,
    Math.min(windowHeight - 320, windowHeight * 0.62),
  );

  const activePhoto: CanvasPhoto = photo ?? {
    id: "empty",
    type: "photo",
    uri: "",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    zIndex: 0,
  };

  useEffect(() => {
    if (!photo || !visible) {
      return;
    }

    setZoom(Math.max(MIN_ZOOM, photo.photoZoom ?? MIN_ZOOM));
    setCropOffset({
      x: photo.cropOffsetX ?? 0,
      y: photo.cropOffsetY ?? 0,
    });
    setFrameSize({
      width: photo.width,
      height: photo.height,
    });
    setFrameCenterOffset({ x: 0, y: 0 });
    setPreviewScale(
      Math.min(
        canvasWidth / Math.max(1, photo.width),
        canvasHeight / Math.max(1, photo.height),
      ),
    );
    setSelectedPresetKey(
      getPresetKeyFromRatio(photo.width / Math.max(1, photo.height)),
    );
  }, [photo, visible, canvasWidth, canvasHeight]);

  const originalWidth = activePhoto.originalWidth ?? activePhoto.width;
  const originalHeight = activePhoto.originalHeight ?? activePhoto.height;
  const selectedPreset = imageCropPresets.find(
    (preset) => preset.key === selectedPresetKey,
  );
  const lockedAspectRatio = selectedPreset?.aspect
    ? selectedPreset.aspect[0] / selectedPreset.aspect[1]
    : null;

  const resolvedPreviewScale = Math.max(0.001, previewScale);
  const maxFrameWidth = canvasWidth / resolvedPreviewScale;
  const maxFrameHeight = canvasHeight / resolvedPreviewScale;

  const clampFrameCenterOffset = (
    frameCenterOffsetX: number,
    frameCenterOffsetY: number,
    targetFrameSize = frameSize,
  ) => {
    const maxOffsetX = Math.max(
      0,
      canvasWidth / resolvedPreviewScale / 2 - targetFrameSize.width / 2,
    );
    const maxOffsetY = Math.max(
      0,
      canvasHeight / resolvedPreviewScale / 2 - targetFrameSize.height / 2,
    );

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, frameCenterOffsetX)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, frameCenterOffsetY)),
    };
  };

  const resolvedFrameCenterOffset = clampFrameCenterOffset(
    frameCenterOffset.x,
    frameCenterOffset.y,
  );
  const previewFrameWidth = Math.max(
    MIN_PREVIEW_FRAME_SIZE,
    frameSize.width * resolvedPreviewScale,
  );
  const previewFrameHeight = Math.max(
    MIN_PREVIEW_FRAME_SIZE,
    frameSize.height * resolvedPreviewScale,
  );

  const getRenderedImageOutputSize = (
    targetFrameWidth: number,
    targetFrameHeight: number,
    nextZoom: number,
  ) => {
    const coverScale =
      Math.max(
        targetFrameWidth / Math.max(1, originalWidth),
        targetFrameHeight / Math.max(1, originalHeight),
      ) * nextZoom;

    return {
      width: originalWidth * coverScale,
      height: originalHeight * coverScale,
    };
  };

  const getBaseCoverScale = (
    targetFrameWidth: number,
    targetFrameHeight: number,
  ) =>
    Math.max(
      targetFrameWidth / Math.max(1, originalWidth),
      targetFrameHeight / Math.max(1, originalHeight),
    );

  const clampCropOffset = (
    cropOffsetX: number,
    cropOffsetY: number,
    nextZoom: number,
    targetFrameSize = frameSize,
  ) => {
    const rendered = getRenderedImageOutputSize(
      targetFrameSize.width,
      targetFrameSize.height,
      nextZoom,
    );
    const maxOffsetX = Math.max(0, (rendered.width - targetFrameSize.width) / 2);
    const maxOffsetY = Math.max(
      0,
      (rendered.height - targetFrameSize.height) / 2,
    );

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, cropOffsetX)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, cropOffsetY)),
    };
  };

  const resolvedCropOffset = clampCropOffset(cropOffset.x, cropOffset.y, zoom);
  const renderedImageOutputSize = getRenderedImageOutputSize(
    frameSize.width,
    frameSize.height,
    zoom,
  );
  const renderedImagePreviewSize = {
    width: renderedImageOutputSize.width * resolvedPreviewScale,
    height: renderedImageOutputSize.height * resolvedPreviewScale,
  };
  const frameRect = {
    left:
      (canvasWidth - previewFrameWidth) / 2 +
      resolvedFrameCenterOffset.x * resolvedPreviewScale,
    top:
      (canvasHeight - previewFrameHeight) / 2 +
      resolvedFrameCenterOffset.y * resolvedPreviewScale,
    width: previewFrameWidth,
    height: previewFrameHeight,
  };
  const imagePosition = {
    left:
      frameRect.left +
      (previewFrameWidth - renderedImagePreviewSize.width) / 2 +
      resolvedCropOffset.x * resolvedPreviewScale,
    top:
      frameRect.top +
      (previewFrameHeight - renderedImagePreviewSize.height) / 2 +
      resolvedCropOffset.y * resolvedPreviewScale,
  };

  const getTouchDistance = (
    touches: readonly { pageX: number; pageY: number }[],
  ) => {
    if (touches.length < 2) {
      return 0;
    }

    const [first, second] = touches;
    return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isResizingRef.current,
    onMoveShouldSetPanResponder: () => !isResizingRef.current,
    onPanResponderTerminationRequest: () => !isResizingRef.current,
    onPanResponderGrant: (event) => {
      if (isResizingRef.current) {
        return;
      }

      const touches = event.nativeEvent.touches;

      if (touches.length >= 2) {
        gestureModeRef.current = "pinch";
        pinchStartDistanceRef.current = getTouchDistance(touches);
        pinchStartZoomRef.current = zoom;
        pinchStartOffsetRef.current = resolvedCropOffset;
        return;
      }

      gestureModeRef.current = "pan";
      panStartOffsetRef.current = resolvedCropOffset;
      panStartPointerRef.current = {
        pageX: event.nativeEvent.pageX,
        pageY: event.nativeEvent.pageY,
      };
    },
    onPanResponderMove: (event) => {
      if (isResizingRef.current) {
        return;
      }

      const touches = event.nativeEvent.touches;

      if (touches.length >= 2) {
        const nextDistance = getTouchDistance(touches);
        if (!pinchStartDistanceRef.current) {
          pinchStartDistanceRef.current = nextDistance || 1;
          pinchStartZoomRef.current = zoom;
          pinchStartOffsetRef.current = resolvedCropOffset;
        }

        gestureModeRef.current = "pinch";
        const nextZoom = Math.min(
          MAX_ZOOM,
          Math.max(
            MIN_ZOOM,
            Number(
              (
                pinchStartZoomRef.current *
                (nextDistance / Math.max(1, pinchStartDistanceRef.current))
              ).toFixed(3),
            ),
          ),
        );
        const nextOffset = clampCropOffset(
          pinchStartOffsetRef.current.x,
          pinchStartOffsetRef.current.y,
          nextZoom,
        );
        setZoom(nextZoom);
        setCropOffset(nextOffset);
        return;
      }

      if (gestureModeRef.current !== "pan") {
        gestureModeRef.current = "pan";
        panStartOffsetRef.current = resolvedCropOffset;
        panStartPointerRef.current = {
          pageX: event.nativeEvent.pageX,
          pageY: event.nativeEvent.pageY,
        };
      }

      const startPointer = panStartPointerRef.current;
      if (!startPointer) {
        return;
      }

      const nextOffset = clampCropOffset(
        panStartOffsetRef.current.x +
          (event.nativeEvent.pageX - startPointer.pageX) / resolvedPreviewScale,
        panStartOffsetRef.current.y +
          (event.nativeEvent.pageY - startPointer.pageY) / resolvedPreviewScale,
        zoom,
      );
      setCropOffset(nextOffset);
    },
    onPanResponderRelease: () => {
      gestureModeRef.current = "none";
      panStartPointerRef.current = null;
      pinchStartDistanceRef.current = 0;
    },
    onPanResponderTerminate: () => {
      gestureModeRef.current = "none";
      panStartPointerRef.current = null;
      pinchStartDistanceRef.current = 0;
    },
  });

  const resizeFrame = (handle: ResizeHandle, pageX: number, pageY: number) => {
    const start = resizeStartRef.current;
    if (!start) {
      return;
    }

    const deltaX = (pageX - start.pageX) / start.previewScale;
    const deltaY = (pageY - start.pageY) / start.previewScale;

    let nextWidth = start.width;
    let nextHeight = start.height;

    if (lockedAspectRatio) {
      if (handle === "left" || handle === "right") {
        nextWidth = Math.max(
          MIN_FRAME_SIZE,
          start.width + (handle === "right" ? deltaX : -deltaX),
        );
        nextHeight = nextWidth / lockedAspectRatio;
      } else {
        nextHeight = Math.max(
          MIN_FRAME_SIZE,
          start.height + (handle === "bottom" ? deltaY : -deltaY),
        );
        nextWidth = nextHeight * lockedAspectRatio;
      }
    } else {
      if (handle === "left" || handle === "right") {
        nextWidth = Math.max(
          MIN_FRAME_SIZE,
          start.width + (handle === "right" ? deltaX : -deltaX),
        );
      } else {
        nextHeight = Math.max(
          MIN_FRAME_SIZE,
          start.height + (handle === "bottom" ? deltaY : -deltaY),
        );
      }
    }

    const nextFrameSize = clampFrameSize(
      nextWidth,
      nextHeight,
      maxFrameWidth,
      maxFrameHeight,
    );
    const widthChange = nextFrameSize.width - start.width;
    const heightChange = nextFrameSize.height - start.height;
    const centerDeltaX =
      handle === "right"
        ? widthChange / 2
        : handle === "left"
          ? -widthChange / 2
          : 0;
    const centerDeltaY =
      handle === "bottom"
        ? heightChange / 2
        : handle === "top"
          ? -heightChange / 2
          : 0;
    const nextFrameCenterOffset = clampFrameCenterOffset(
      start.frameCenterOffsetX + centerDeltaX,
      start.frameCenterOffsetY + centerDeltaY,
      nextFrameSize,
    );
    const startRenderedScale =
      getBaseCoverScale(start.width, start.height) * start.zoom;
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Number(
          (
            startRenderedScale /
            Math.max(
              0.001,
              getBaseCoverScale(nextFrameSize.width, nextFrameSize.height),
            )
          ).toFixed(3),
        ),
      ),
    );
    const actualCenterDeltaX =
      nextFrameCenterOffset.x - start.frameCenterOffsetX;
    const actualCenterDeltaY =
      nextFrameCenterOffset.y - start.frameCenterOffsetY;
    const nextCropOffset = clampCropOffset(
      start.cropOffsetX - actualCenterDeltaX,
      start.cropOffsetY - actualCenterDeltaY,
      nextZoom,
      nextFrameSize,
    );

    setFrameSize(nextFrameSize);
    setFrameCenterOffset(nextFrameCenterOffset);
    setZoom(nextZoom);
    setCropOffset(nextCropOffset);
  };

  const createResizeResponder = (handle: ResizeHandle) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        isResizingRef.current = true;
        gestureModeRef.current = "none";
        panStartPointerRef.current = null;
        pinchStartDistanceRef.current = 0;
        resizeStartRef.current = {
          width: frameSize.width,
          height: frameSize.height,
          pageX: event.nativeEvent.pageX,
          pageY: event.nativeEvent.pageY,
          previewScale: resolvedPreviewScale,
          frameCenterOffsetX: resolvedFrameCenterOffset.x,
          frameCenterOffsetY: resolvedFrameCenterOffset.y,
          cropOffsetX: resolvedCropOffset.x,
          cropOffsetY: resolvedCropOffset.y,
          zoom,
        };
      },
      onPanResponderMove: (event) => {
        resizeFrame(handle, event.nativeEvent.pageX, event.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        isResizingRef.current = false;
        resizeStartRef.current = null;
      },
      onPanResponderTerminate: () => {
        isResizingRef.current = false;
        resizeStartRef.current = null;
      },
    });

  const resizeRightResponder = createResizeResponder("right");
  const resizeBottomResponder = createResizeResponder("bottom");
  const resizeLeftResponder = createResizeResponder("left");
  const resizeTopResponder = createResizeResponder("top");

  const handleZoomChange = (direction: -1 | 1) => {
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Number((zoom + direction * ZOOM_STEP).toFixed(2))),
    );
    const nextOffset = clampCropOffset(cropOffset.x, cropOffset.y, nextZoom);
    setZoom(nextZoom);
    setCropOffset(nextOffset);
  };

  const handleReset = () => {
    setZoom(MIN_ZOOM);
    setCropOffset({ x: 0, y: 0 });
    setFrameCenterOffset({ x: 0, y: 0 });
    setFrameSize({
      width: Math.min(photo?.width ?? frameSize.width, maxFrameWidth),
      height: Math.min(photo?.height ?? frameSize.height, maxFrameHeight),
    });
  };

  const handlePresetChange = (presetKey: CropPresetKey) => {
    setSelectedPresetKey(presetKey);

    if (presetKey === "free") {
      return;
    }

    const preset = imageCropPresets.find((item) => item.key === presetKey);
    if (!preset?.aspect) {
      return;
    }

    const ratio = preset.aspect[0] / preset.aspect[1];
    const currentArea = Math.max(1, frameSize.width * frameSize.height);
    const nextWidth = Math.sqrt(currentArea * ratio);
    const nextHeight = nextWidth / ratio;
    const nextFrameSize = clampFrameSize(
      nextWidth,
      nextHeight,
      maxFrameWidth,
      maxFrameHeight,
    );
    const nextFrameCenterOffset = clampFrameCenterOffset(
      frameCenterOffset.x,
      frameCenterOffset.y,
      nextFrameSize,
    );
    const actualCenterDeltaX = nextFrameCenterOffset.x - frameCenterOffset.x;
    const actualCenterDeltaY = nextFrameCenterOffset.y - frameCenterOffset.y;
    const nextCropOffset = clampCropOffset(
      cropOffset.x - actualCenterDeltaX,
      cropOffset.y - actualCenterDeltaY,
      zoom,
      nextFrameSize,
    );

    setFrameSize(nextFrameSize);
    setFrameCenterOffset(nextFrameCenterOffset);
    setCropOffset(nextCropOffset);
  };

  if (!photo) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top + spacing.md, spacing.xxl),
            paddingBottom: Math.max(insets.bottom + spacing.md, spacing.xxl),
          },
        ]}
      >
        <View style={styles.header}>
          <AppButton
            label="취소"
            variant="ghost"
            onPress={onClose}
            style={styles.headerButton}
            labelStyle={styles.cancelButtonLabel}
          />
          <AppText variant="title" style={styles.title}>
            사진 자르기
          </AppText>
          <AppButton
            label="적용"
            variant="primary"
            onPress={() =>
              onConfirm({
                cropOffsetX: resolvedCropOffset.x,
                cropOffsetY: resolvedCropOffset.y,
                photoZoom: zoom,
                width: frameSize.width,
                height: frameSize.height,
              })
            }
            style={styles.headerButton}
          />
        </View>

        <View style={styles.body}>
          <AppText variant="caption" style={styles.helper}>
            한 손가락으로 위치를 옮기고, 두 손가락으로 확대하세요.
          </AppText>

          <View style={styles.presetRow}>
            {imageCropPresets.map((preset) => {
              const selected = preset.key === selectedPresetKey;

              return (
                <Pressable
                  key={preset.key}
                  onPress={() => handlePresetChange(preset.key)}
                  style={[
                    styles.presetChip,
                    selected && styles.presetChipSelected,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.presetChipText,
                      selected && styles.presetChipTextSelected,
                    ]}
                  >
                    {preset.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.previewArea}>
            <View
              style={[styles.canvasStage, { width: canvasWidth, height: canvasHeight }]}
            >
              <View
                style={[styles.cropCanvas, { width: canvasWidth, height: canvasHeight }]}
              >
                <View
                  style={[
                    styles.imageLayer,
                    {
                      width: renderedImagePreviewSize.width,
                      height: renderedImagePreviewSize.height,
                      left: imagePosition.left,
                      top: imagePosition.top,
                    },
                  ]}
                >
                  <Image source={{ uri: activePhoto.uri }} style={styles.image} />
                </View>

                <View
                  pointerEvents="none"
                  style={[
                    styles.dimTop,
                    {
                      left: 0,
                      top: 0,
                      width: canvasWidth,
                      height: frameRect.top,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.dimBottom,
                    {
                      left: 0,
                      top: frameRect.top + frameRect.height,
                      width: canvasWidth,
                      height: canvasHeight - frameRect.top - frameRect.height,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.dimSide,
                    {
                      left: 0,
                      top: frameRect.top,
                      width: frameRect.left,
                      height: frameRect.height,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.dimSide,
                    {
                      left: frameRect.left + frameRect.width,
                      top: frameRect.top,
                      width: canvasWidth - frameRect.left - frameRect.width,
                      height: frameRect.height,
                    },
                  ]}
                />

                <View
                  {...panResponder.panHandlers}
                  style={[
                    styles.cropFrame,
                    {
                      left: frameRect.left,
                      top: frameRect.top,
                      width: frameRect.width,
                      height: frameRect.height,
                    },
                  ]}
                >
                  <View style={[styles.gridLineVertical, { left: "33.333%" }]} />
                  <View style={[styles.gridLineVertical, { left: "66.666%" }]} />
                  <View style={[styles.gridLineHorizontal, { top: "33.333%" }]} />
                  <View style={[styles.gridLineHorizontal, { top: "66.666%" }]} />
                </View>
              </View>

              <View pointerEvents="box-none" style={styles.handleOverlay}>
                <View
                  {...resizeRightResponder.panHandlers}
                  style={[
                    styles.handle,
                    styles.handleX,
                    {
                      left: frameRect.left + frameRect.width - 10,
                      top: frameRect.top + frameRect.height / 2 - 18,
                    },
                  ]}
                >
                  <View style={styles.handleGripVertical} />
                </View>
                <View
                  {...resizeBottomResponder.panHandlers}
                  style={[
                    styles.handle,
                    styles.handleY,
                    {
                      left: frameRect.left + frameRect.width / 2 - 18,
                      top: frameRect.top + frameRect.height - 10,
                    },
                  ]}
                >
                  <View style={styles.handleGripHorizontal} />
                </View>
                <View
                  {...resizeTopResponder.panHandlers}
                  style={[
                    styles.handle,
                    styles.handleY,
                    {
                      left: frameRect.left + frameRect.width / 2 - 18,
                      top: frameRect.top - 10,
                    },
                  ]}
                >
                  <View style={styles.handleGripHorizontal} />
                </View>
                <View
                  {...resizeLeftResponder.panHandlers}
                  style={[
                    styles.handle,
                    styles.handleX,
                    {
                      left: frameRect.left - 10,
                      top: frameRect.top + frameRect.height / 2 - 18,
                    },
                  ]}
                >
                  <View style={styles.handleGripVertical} />
                </View>
              </View>
            </View>
          </View>

          
        </View>
      </View>
    </Modal>
  );
};

export default PhotoCropModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#111111",
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerButton: {
    minWidth: 84,
  },
  cancelButtonLabel: {
    color: colors.background.base,
  },
  title: {
    color: colors.text.inverse,
  },
  body: {
    flex: 1,
  },
  helper: {
    color: "rgba(255, 250, 241, 0.72)",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  presetRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.round,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  presetChipSelected: {
    backgroundColor: colors.accent.soft,
    borderColor: colors.accent.main,
  },
  presetChipText: {
    color: colors.text.inverse,
  },
  presetChipTextSelected: {
    color: colors.text.primary,
  },
  previewArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasStage: {
    position: "relative",
    overflow: "visible",
  },
  cropCanvas: {
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: "#0D0D0D",
  },
  imageLayer: {
    position: "absolute",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  dimTop: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dimBottom: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dimSide: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  cropFrame: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  handleOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  handle: {
    position: "absolute",
    backgroundColor: colors.accent.soft,
    borderWidth: 1,
    borderColor: colors.accent.main,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#120A08",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },
  handleX: {
    width: 18,
    height: 42,
    borderRadius: radius.round,
  },
  handleY: {
    width: 42,
    height: 18,
    borderRadius: radius.round,
  },
  handleGripVertical: {
    width: 3,
    height: 18,
    borderRadius: radius.round,
    backgroundColor: colors.accent.strong,
  },
  handleGripHorizontal: {
    width: 18,
    height: 3,
    borderRadius: radius.round,
    backgroundColor: colors.accent.strong,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  zoomButton: {
    minWidth: 64,
  },
  zoomReadout: {
    alignItems: "center",
    minWidth: 120,
  },
  zoomValue: {
    color: colors.text.inverse,
    marginBottom: spacing.xxs,
  },
  resetButton: {
    minHeight: 36,
  },
});
