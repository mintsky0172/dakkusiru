import { create } from "zustand";
import {
  CanvasBackground,
  CanvasObject,
  CanvasSticker,
  CanvasText,
} from "../types/editor";

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

  addText: () => void;
  updateTextContent: (id: string, text: string) => void;

  selectObject: (id: string | null) => void;
  clearObjects: () => void;
  removeSelectedObject: () => void;
  removeObject: (id: string) => void;

  updateObjectPosition: (id: string, x: number, y: number) => void;
  bringObjectToFront: (id: string) => void;

  updateObjectSize: (id: string, width: number, height: number) => void;
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

  updateTextContent: (id, text) =>
    set((state) => ({
      objects: state.objects.map((item) => {
        if (item.id !== id || item.type !== "text") return item;

        const nextWidth = Math.max(120, text.length * (item.fontSize * 0.75));
        const nextHeight = Math.max(44, item.fontSize + 20);

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

  bringObjectToFront: (id) =>
    set((state) => {
      const maxZ = state.objects.reduce(
        (acc, item) => Math.max(acc, item.zIndex),
        0,
      );
      return {
        objects: state.objects.map((item) =>
          item.id === id ? { ...item, zIndex: maxZ + 1 } : item,
        ),
        historyPast: [...state.historyPast, getSnapshot(state)],
        historyFuture: [],
      };
    }),

  updateObjectSize: (id, width, height) =>
    set((state) => ({
      objects: state.objects.map((item) => {
        if (item.id !== id) return item;

        if (item.type === "text") {
          const nextWidth = Math.max(120, width);
          const nextFontSize = Math.max(12, Math.round(height - 20));
          const nextHeight = Math.max(44, nextFontSize + 20);

          return {
            ...item,
            width: nextWidth,
            height: nextHeight,
            fontSize: nextFontSize,
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
