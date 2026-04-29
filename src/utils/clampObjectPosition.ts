import { CanvasObject } from "../types/editor";

interface CanvasSize {
  width: number;
  height: number;
}

export function clampObjectPosition(
  item: CanvasObject,
  x: number,
  y: number,
  canvasSize: CanvasSize,
) {
  if (!canvasSize.width || !canvasSize.height) {
    return { x, y };
  }

  const visibleRatio = getVisibleRatioByType(item.type);

  const minX = -item.width * (1 - visibleRatio);
  const maxX = canvasSize.width - item.width * visibleRatio;

  const minY = -item.height * (1 - visibleRatio);
  const maxY = canvasSize.height - item.height * visibleRatio;

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

function getVisibleRatioByType(type: CanvasObject["type"]) {
  switch (type) {
    case "photo":
      return 0.18;
    case "sticker":
      return 0.28;
    case "text":
      return 0.45;
    default:
      return 0.3;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
