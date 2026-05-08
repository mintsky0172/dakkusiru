export const packCategoryLabelMap: Record<string, string> = {
  food: "음식",
  character: "캐릭터",
  deco: "데코",
  memo: "메모",
  lettering: "글자",
  object: "소품",
  nature: "자연/동식물",
  masking_tape: "마스킹테이프",
  etc: "기타",
  simple: "심플",
  vintage: "빈티지",
  landscape: "풍경",
};

export const stickerCategoryOptions = [
  "food",
  "character",
  "deco",
  "memo",
  "lettering",
  "masking_tape",
  "object",
  "nature",
  "etc",
] as const;

export const backgroundCategoryOptions = [
  "simple",
  "deco",
  "vintage",
  "landscape",
  "etc",
] as const;

export type StickerPackCategory = (typeof stickerCategoryOptions)[number];
export type BackgroundPackCategory = (typeof backgroundCategoryOptions)[number];
