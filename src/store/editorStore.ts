import { create } from "zustand";
import { CanvasSticker } from "../types/editor";

interface EditorStore {
  stickers: CanvasSticker[];
  selectedStickerId: string | null;

  addSticker: (payload: { stickerId: string; imageSource: any }) => void;

  selectSticker: (id: string | null) => void;
  clearStickers: () => void;
  removeSelectedSticker: () => void;

  updateStickerPosition: (id: string, x: number, y: number) => void;
  bringStickerToFront: (id: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  stickers: [],
  selectedStickerId: null,

  addSticker: ({ stickerId, imageSource }) =>
    set((state) => {
      const maxZ = state.stickers.reduce(
        (acc, item) => Math.max(acc, item.zIndex),
        0,
      );

      const newSticker: CanvasSticker = {
        id: `${Date.now()}-${Math.random()}`,
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
        stickers: [...state.stickers, newSticker],
        selectedStickerId: newSticker.id,
      };
    }),

  selectSticker: (id) => set({ selectedStickerId: id }),

  clearStickers: () => set({ stickers: [], selectedStickerId: null }),

  removeSelectedSticker: () => {
    const selectedStickerId = get().selectedStickerId;

    if (!selectedStickerId) return;

    set((state) => ({
      stickers: state.stickers.filter((item) => item.id !== selectedStickerId),
      selectedStickerId: null,
    }));
  },

  updateStickerPosition: (id, x, y) =>
    set((state) => ({
      stickers: state.stickers.map((item) =>
        item.id === id ? { ...item, x, y } : item,
      ),
    })),

  bringStickerToFront: (id) =>
    set((state) => {
      const maxZ = state.stickers.reduce(
        (acc, item) => Math.max(acc, item.zIndex),
        0,
      );
      return {
        stickers: state.stickers.map((item) =>
          item.id === id ? { ...item, zIndex: maxZ + 1 } : item,
        ),
      };
    }),
}));
