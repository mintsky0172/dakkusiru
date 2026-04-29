import { create } from "zustand";
import {
  CanvasBackground,
  CanvasObject,
  CanvasSticker,
  CanvasText,
  ObjectResizeOptions,
} from "../types/editor";
import { spacing } from "../constants/spacing";

interface EditorSnapshot {
  background: CanvasBackground | null;
  objects: CanvasObject[];
  selectedObjectId: string | null;
}

interface EditorStore {
  background: CanvasBackground | null;
  objects: CanvasObject[];
  selectedObjectId: string | null;
  historyPast: EditorSnapshot[];
  historyFuture: EditorSnapshot[];

  setBackground: (payload: CanvasBackground) => void;

  addSticker: (payload: { stickerId: string; imageSource: any }) => void;
  addPhoto: (payload: {
    uri: string;
    width?: number;
    height?: number;
    originalWidth?: number;
    originalHeight?: number;
  }) => void;

  addText: () => void;
  updateTextContent: (
    id: string,
    text: string,
    measuredHeight?: number,
  ) => void;

  selectObject: (id: string | null) => void;
  clearObjects: () => void;
  removeSelectedObject: () => void;
  removeObject: (id: string) => void;

  updateObjectPosition: (id: string, x: number, y: number) => void;
  bringObjectForward: (id: string) => void;
  sendObjectBackward: (id: string) => void;

  updateObjectSize: (
    id: string,
    width: number,
    height: number,
    options?: ObjectResizeOptions,
  ) => void;
  updatePhotoCrop: (
    id: string,
    cropOffsetX: number,
    cropOffsetY: number,
    photoZoom?: number,
    width?: number,
    height?: number,
  ) => void;
  updateObjectRotation: (id: string, rotation: number) => void;

  setEditorData: (payload: {
    background: CanvasBackground | null;
    objects: CanvasObject[];
  }) => void;

  undo: () => void;
  redo: () => void;

  resetEditor: () => void;
}

const DEFAULT_BACKGROUND: CanvasBackground = {
  id: "default-background",
  backgroundColor: "#FFFFFF",
};

const MIN_TEXT_WIDTH = 120;
const MIN_TEXT_HEIGHT = 44;
const MIN_TEXT_FONT_SIZE = 12;
const TEXT_HEIGHT_PADDING = spacing.xs * 2;
const TEXT_HEIGHT_BUFFER = spacing.xxs;
const MIN_PHOTO_ZOOM = 1;

const getTextLines = (text: string) => text.split(/\r?\n/);

const getLongestLineLength = (text: string) =>
  getTextLines(text).reduce((max, line) => Math.max(max, line.length), 0);

const getTextLineHeight = (fontSize: number) =>
  Math.max(fontSize, Math.round(fontSize * 1.25));

const getMinTextHeight = (text: string, fontSize: number) =>
  Math.max(
    MIN_TEXT_HEIGHT,
    getTextLines(text).length * getTextLineHeight(fontSize) +
      TEXT_HEIGHT_PADDING +
      TEXT_HEIGHT_BUFFER,
  );

const getPhotoRenderedSize = (
  frameWidth: number,
  frameHeight: number,
  originalWidth: number,
  originalHeight: number,
  zoom = MIN_PHOTO_ZOOM,
  photoScale?: number,
) => {
  const safeOriginalWidth = Math.max(1, originalWidth);
  const safeOriginalHeight = Math.max(1, originalHeight);
  const scale =
    photoScale ??
    getPhotoBaseCoverScale(
      frameWidth,
      frameHeight,
      safeOriginalWidth,
      safeOriginalHeight,
    ) *
      zoom;

  return {
    width: safeOriginalWidth * scale,
    height: safeOriginalHeight * scale,
  };
};

const getPhotoBaseCoverScale = (
  frameWidth: number,
  frameHeight: number,
  originalWidth: number,
  originalHeight: number,
) =>
  Math.max(
    frameWidth / Math.max(1, originalWidth),
    frameHeight / Math.max(1, originalHeight),
  );

const clampPhotoCropOffsets = (
  frameWidth: number,
  frameHeight: number,
  originalWidth: number,
  originalHeight: number,
  zoom = MIN_PHOTO_ZOOM,
  cropOffsetX = 0,
  cropOffsetY = 0,
  photoScale?: number,
) => {
  const renderedSize = getPhotoRenderedSize(
    frameWidth,
    frameHeight,
    originalWidth,
    originalHeight,
    zoom,
    photoScale,
  );
  const maxOffsetX = Math.max(0, (renderedSize.width - frameWidth) / 2);
  const maxOffsetY = Math.max(0, (renderedSize.height - frameHeight) / 2);

  return {
    cropOffsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, cropOffsetX)),
    cropOffsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, cropOffsetY)),
  };
};

const cloneSnapshot = (snapshot: EditorSnapshot): EditorSnapshot => ({
  background: snapshot.background ? { ...snapshot.background } : null,
  objects: snapshot.objects.map((item) => ({ ...item })),
  selectedObjectId: snapshot.selectedObjectId,
});

const getSnapshot = (state: EditorStore): EditorSnapshot => ({
  background: state.background ? { ...state.background } : null,
  objects: state.objects.map((item) => ({ ...item })),
  selectedObjectId: state.selectedObjectId,
});

export const useEditorStore = create<EditorStore>((set, get) => ({
  background: DEFAULT_BACKGROUND,
  objects: [],
  selectedObjectId: null,
  historyPast: [],
  historyFuture: [],

  setEditorData: ({ background, objects }) =>
    set({
      background,
      objects,
      selectedObjectId: null,
      historyPast: [],
      historyFuture: [],
    }),

  resetEditor: () =>
    set({
      background: DEFAULT_BACKGROUND,
      objects: [],
      selectedObjectId: null,
      historyPast: [],
      historyFuture: [],
    }),

  setBackground: (payload) =>
    set((state) => ({
      background: payload,
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    })),

  addSticker: ({ stickerId, imageSource }) =>
    set((state) => {
      const maxZ = state.objects.reduce(
        (acc, item) => Math.max(acc, item.zIndex),
        0,
      );

      const newSticker: CanvasSticker = {
        id: `${Date.now()}-${Math.random()}`,
        type: "sticker",
        stickerId,
        imageSource,
        x: 20,
        y: 20,
        width: 120,
        height: 120,
        rotation: 0,
        zIndex: maxZ + 1,
      };

      return {
        objects: [...state.objects, newSticker],
        selectedObjectId: newSticker.id,
        historyPast: [...state.historyPast, getSnapshot(state)],
        historyFuture: [],
      };
    }),

  addText: () =>
    set((state) => {
      const maxZ = state.objects.reduce(
        (acc, item) => Math.max(acc, item.zIndex),
        0,
      );

      const newText: CanvasText = {
        id: `${Date.now()}-${Math.random()}`,
        type: "text",
        text: "텍스트를 입력하세요",
        x: 20,
        y: 20,
        width: 140,
        height: 40,
        rotation: 0,
        zIndex: maxZ + 1,
        fontSize: 16,
        color: "#590D0D",
      };

      return {
        objects: [...state.objects, newText],
        selectedObjectId: newText.id,
        historyPast: [...state.historyPast, getSnapshot(state)],
        historyFuture: [],
      };
    }),

  addPhoto: ({
    uri,
    width = 180,
    height = 180,
    originalWidth = width,
    originalHeight = height,
  }) =>
    set((state) => {
      const newPhoto = {
        id: `${Date.now()}-${Math.random()}`,
        type: "photo" as const,
        uri,
        x: 20,
        y: 20,
        width,
        height,
        originalWidth,
        originalHeight,
        photoZoom: MIN_PHOTO_ZOOM,
        photoScale:
          getPhotoBaseCoverScale(width, height, originalWidth, originalHeight) *
          MIN_PHOTO_ZOOM,
        cropOffsetX: 0,
        cropOffsetY: 0,
        rotation: 0,
        zIndex: state.objects.length + 1,
      };

      return {
        objects: [...state.objects, newPhoto],
        selectedObjectId: newPhoto.id,
        historyPast: [...state.historyPast, getSnapshot(state)],
        historyFuture: [],
      };
    }),

  updateTextContent: (id, text, measuredHeight) =>
    set((state) => ({
      objects: state.objects.map((item) => {
        if (item.id !== id || item.type !== "text") return item;

        const nextWidth = Math.max(
          item.width,
          MIN_TEXT_WIDTH,
          getLongestLineLength(text) * (item.fontSize * 0.75),
        );
        const nextHeight = Math.max(
          measuredHeight ?? 0,
          getMinTextHeight(text, item.fontSize),
        );

        return {
          ...item,
          text,
          width: nextWidth,
          height: nextHeight,
        };
      }),
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    })),

  selectObject: (id) => set({ selectedObjectId: id }),

  clearObjects: () => set({ objects: [], selectedObjectId: null }),

  removeSelectedObject: () => {
    const selectedObjectId = get().selectedObjectId;

    if (!selectedObjectId) return;

    set((state) => ({
      objects: state.objects.filter((item) => item.id !== selectedObjectId),
      selectedObjectId: null,
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    }));
  },

  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((item) => item.id !== id),
      selectedObjectId:
        state.selectedObjectId === id ? null : state.selectedObjectId,
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    })),

  updateObjectPosition: (id, x, y) =>
    set((state) => ({
      objects: state.objects.map((item) =>
        item.id === id ? { ...item, x, y } : item,
      ),
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    })),

  bringObjectForward: (id) =>
    set((state) => {
      const orderedObjects = [...state.objects].sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      const currentIndex = orderedObjects.findIndex((item) => item.id === id);
      if (currentIndex < 0 || currentIndex === orderedObjects.length - 1) {
        return state;
      }

      [orderedObjects[currentIndex], orderedObjects[currentIndex + 1]] = [
        orderedObjects[currentIndex + 1],
        orderedObjects[currentIndex],
      ];

      const nextZIndexById = new Map(
        orderedObjects.map((item, index) => [item.id, index + 1]),
      );

      return {
        objects: state.objects.map((item) => ({
          ...item,
          zIndex: nextZIndexById.get(item.id) ?? item.zIndex,
        })),
        historyPast: [...state.historyPast, getSnapshot(state)],
        historyFuture: [],
      };
    }),

  sendObjectBackward: (id) =>
    set((state) => {
      const orderedObjects = [...state.objects].sort(
        (a, b) => a.zIndex - b.zIndex,
      );
      const currentIndex = orderedObjects.findIndex((item) => item.id === id);
      if (currentIndex <= 0) {
        return state;
      }

      [orderedObjects[currentIndex - 1], orderedObjects[currentIndex]] = [
        orderedObjects[currentIndex],
        orderedObjects[currentIndex - 1],
      ];

      const nextZIndexById = new Map(
        orderedObjects.map((item, index) => [item.id, index + 1]),
      );

      return {
        objects: state.objects.map((item) => ({
          ...item,
          zIndex: nextZIndexById.get(item.id) ?? item.zIndex,
        })),
        historyPast: [...state.historyPast, getSnapshot(state)],
        historyFuture: [],
      };
    }),

  updateObjectSize: (id, width, height, options) =>
    set((state) => ({
      objects: state.objects.map((item) => {
        if (item.id !== id) return item;

        if (item.type === "text") {
          const nextWidth = Math.max(MIN_TEXT_WIDTH, width);
          const nextRawHeight = Math.max(MIN_TEXT_HEIGHT, height);
          const source = options?.source ?? "transform";
          const axis = options?.axis ?? "proportional";
          const widthScale = item.width ? nextWidth / item.width : 1;
          const heightScale = item.height ? nextRawHeight / item.height : 1;

          let nextFontSize = item.fontSize;

          if (source === "transform") {
            const scale =
              axis === "x"
                ? 1
                : axis === "y"
                  ? 1
                  : axis === "xy"
                    ? Math.max(widthScale, heightScale)
                    : widthScale;

            nextFontSize = Math.max(
              MIN_TEXT_FONT_SIZE,
              Math.round(item.fontSize * scale),
            );
          }

          const nextHeight = Math.max(
            nextRawHeight,
            getMinTextHeight(item.text, nextFontSize),
          );

          return {
            ...item,
            width: nextWidth,
            height: nextHeight,
            fontSize: nextFontSize,
          };
        }

        if (item.type === "photo") {
          const originalWidth = item.originalWidth ?? item.width;
          const originalHeight = item.originalHeight ?? item.height;
          const currentZoom = Math.max(
            MIN_PHOTO_ZOOM,
            item.photoZoom ?? MIN_PHOTO_ZOOM,
          );
          const currentPhotoScale =
            item.photoScale ??
            getPhotoBaseCoverScale(
              item.width,
              item.height,
              originalWidth,
              originalHeight,
            ) *
              currentZoom;
          const nextWidth = width;
          const nextHeight = height;
          const widthScale = item.width ? nextWidth / item.width : 1;
          const heightScale = item.height ? nextHeight / item.height : 1;
          const objectScale = Math.max(widthScale, heightScale);
          const nextBaseCoverScale = getPhotoBaseCoverScale(
            nextWidth,
            nextHeight,
            originalWidth,
            originalHeight,
          );
          const nextPhotoScale = Math.max(
            currentPhotoScale * objectScale,
            nextBaseCoverScale,
          );
          const nextZoom = Math.max(
            MIN_PHOTO_ZOOM,
            Number(
              (nextPhotoScale / Math.max(0.001, nextBaseCoverScale)).toFixed(3),
            ),
          );
          const nextCrop = clampPhotoCropOffsets(
            nextWidth,
            nextHeight,
            originalWidth,
            originalHeight,
            nextZoom,
            (item.cropOffsetX ?? 0) * widthScale,
            (item.cropOffsetY ?? 0) * heightScale,
            nextPhotoScale,
          );

          return {
            ...item,
            width: nextWidth,
            height: nextHeight,
            originalWidth,
            originalHeight,
            photoZoom: nextZoom,
            photoScale: nextPhotoScale,
            ...nextCrop,
          };
        }

        return {
          ...item,
          width,
          height,
        };
      }),
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    })),

  updatePhotoCrop: (id, cropOffsetX, cropOffsetY, photoZoom, width, height) =>
    set((state) => ({
      objects: state.objects.map((item) => {
        if (item.id !== id || item.type !== "photo") {
          return item;
        }

        const originalWidth = item.originalWidth ?? item.width;
        const originalHeight = item.originalHeight ?? item.height;
        const nextWidth = width ?? item.width;
        const nextHeight = height ?? item.height;
        const nextZoom = Math.max(
          MIN_PHOTO_ZOOM,
          photoZoom ?? item.photoZoom ?? MIN_PHOTO_ZOOM,
        );
        const nextPhotoScale =
          getPhotoBaseCoverScale(
            nextWidth,
            nextHeight,
            originalWidth,
            originalHeight,
          ) * nextZoom;
        const nextCrop = clampPhotoCropOffsets(
          nextWidth,
          nextHeight,
          originalWidth,
          originalHeight,
          nextZoom,
          cropOffsetX,
          cropOffsetY,
          nextPhotoScale,
        );

        return {
          ...item,
          width: nextWidth,
          height: nextHeight,
          originalWidth,
          originalHeight,
          photoZoom: nextZoom,
          photoScale: nextPhotoScale,
          ...nextCrop,
        };
      }),
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    })),

  updateObjectRotation: (id, rotation) =>
    set((state) => ({
      objects: state.objects.map((item) =>
        item.id === id ? { ...item, rotation } : item,
      ),
      historyPast: [...state.historyPast, getSnapshot(state)],
      historyFuture: [],
    })),

  undo: () => {
    const state = get();
    const previousSnapshot = state.historyPast[state.historyPast.length - 1];

    if (!previousSnapshot) return;

    const currentSnapshot = getSnapshot(state);

    set({
      ...cloneSnapshot(previousSnapshot),
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [currentSnapshot, ...state.historyFuture],
    });
  },

  redo: () => {
    const state = get();
    const nextSnapshot = state.historyFuture[0];

    if (!nextSnapshot) return;

    const currentSnapshot = getSnapshot(state);

    set({
      ...cloneSnapshot(nextSnapshot),
      historyPast: [...state.historyPast, currentSnapshot],
      historyFuture: state.historyFuture.slice(1),
    });
  },
}));
