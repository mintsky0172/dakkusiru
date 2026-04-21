import { create } from "zustand";
import {
  CanvasBackground,
  CanvasObject,
  CanvasSticker,
  CanvasText,
} from "../types/editor";

interface EditorStore {
  background: CanvasBackground | null;
  objects: CanvasObject[];
  selectedObjectId: string | null;

  setBackground: (payload: CanvasBackground) => void;

  addSticker: (payload: { stickerId: string; imageSource: any }) => void;

  addText: () => void;
  updateTextContent: (id: string, text: string) => void;

  selectObject: (id: string | null) => void;
  clearObjects: () => void;
  removeSelectedObject: () => void;

  updateObjectPosition: (id: string, x: number, y: number) => void;
  bringObjectToFront: (id: string) => void;

  setEditorData: (payload: {
    background: CanvasBackground | null;
    objects: CanvasObject[];
  }) => void;

  resetEditor: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  background: {
    id: "default-background",
    backgroundColor: "#FFFFFF",
  },

  objects: [],
  selectedObjectId: null,

  setEditorData: ({ background, objects }) =>
    set({
      background,
      objects,
      selectedObjectId: null,
    }),

  resetEditor: () =>
    set({
      background: {
        id: "default-background",
        backgroundColor: "#FFFFFF",
      },
      objects: [],
      selectedObjectId: null,
    }),

  setBackground: (payload) => set({ background: payload }),

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
    })),

  selectObject: (id) => set({ selectedObjectId: id }),

  clearObjects: () => set({ objects: [], selectedObjectId: null }),

  removeSelectedObject: () => {
    const selectedObjectId = get().selectedObjectId;

    if (!selectedObjectId) return;

    set((state) => ({
      objects: state.objects.filter((item) => item.id !== selectedObjectId),
      selectedObjectId: null,
    }));
  },

  updateObjectPosition: (id, x, y) =>
    set((state) => ({
      objects: state.objects.map((item) =>
        item.id === id ? { ...item, x, y } : item,
      ),
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
      };
    }),
}));
