import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  Pressable,
  View,
} from "react-native";
import React, { useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
import IconButton from "../../components/common/IconButton";
import { router } from "expo-router";
import {
  AdminPackKind,
  AdminPackStatus,
  upsertAdminPack,
  upsertAdminPackItem,
} from "../../services/adminShopPackService";
import { pickAdminAssetImage } from "../../utils/pickAdminAssetImage";
import {
  getPackItemImagePath,
  getPackThumbnailPath,
  uploadAdminAsset,
} from "../../services/adminAssetUploadService";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";
import AdminFieldGroup from "../../components/admin/AdminFieldGroup";
import { AdminSegmentedButtons } from "../../components/admin/AdminSegmentedButtons";
import {
  getBaseNameFromFileName,
  getDisplayNameFromItemId,
  normalizeItemId,
} from "../../utils/adminItemName";

interface BatchAdminItem {
  localId: string;
  itemId: string;
  name: string;
  backgroundColor: string;
  base64: string;
  previewUri: string;
}

interface SaveProgress {
  current: number;
  total: number;
  label: string;
}

const categoryLabelMap: Record<string, string> = {
  food: "음식",
  character: "캐릭터",
  deco: "데코",
  memo: "메모",
  chat: "말풍선/문구",
  object: "소품",
  nature: "자연/계절",
  masking_tape: "마스킹테이프",
  etc: "기타",
  grid: "모눈",
  check: "체크",
  dot: "도트/패턴",
  paper: "종이/노트",
  color: "컬러/그라데이션",
  room: "공간",
  landscape: "풍경",
};

const stickerCategoryOptions = [
  "food",
  "character",
  "deco",
  "memo",
  "chat",
  "object",
  "nature",
  "masking_tape",
  "etc",
];

const backgroundCategoryOptions = [
  "grid",
  "check",
  "dot",
  "paper",
  "color",
  "room",
  "deco",
  "landscape",
];

const AdminPackFormScreen = () => {
  const tagInputRef = useRef<TextInput>(null);

  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoaded = useAuthStore((state) => state.isLoaded);

  const isAdmin = profile?.role === "admin";

  const [packId, setPackId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AdminPackKind>("sticker");
  const [status, setStatus] = useState<AdminPackStatus>("priced");
  const [category, setCategory] = useState("food");
  const [coinPrice, setCoinPrice] = useState("1000");
  const [description, setDescription] = useState("");
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const [thumbnailPreviewUri, setThumbnailPreviewUri] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);

  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemSortOrder, setItemSortOrder] = useState("0");
  const [itemBackgroundColor, setItemBackgroundColor] = useState("");
  const [itemImageBase64, setItemImageBase64] = useState<string | null>(null);
  const [itemImagePreviewUri, setItemImagePreviewUri] = useState<string | null>(
    null,
  );
  const [isSavingItem, setIsSavingItem] = useState(false);

  const [batchItems, setBatchItems] = useState<BatchAdminItem[]>([]);
  const [isSavingBatchItems, setIsSavingBatchItems] = useState(false);
  const [expandedBatchItemIds, setExpandedBatchItemIds] = useState<string[]>(
    [],
  );

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const categoryOptions = useMemo(() => {
    return kind === "sticker"
      ? stickerCategoryOptions
      : backgroundCategoryOptions;
  }, [kind]);

  const handlePickThumbnail = async () => {
    try {
      const assets = await pickAdminAssetImage();
      const asset = assets[0];

      if (!asset) return;

      setThumbnailBase64(asset.base64 ?? null);
      setThumbnailPreviewUri(asset.uri);
    } catch (error) {
      Alert.alert(
        "이미지 선택 실패",
        error instanceof Error ? error.message : "이미지를 선택하지 못했어요.",
      );
    }
  };

  const handlePickBatchImages = async () => {
    try {
      const assets = await pickAdminAssetImage();

      if (!assets.length) return;

      const nextItems: BatchAdminItem[] = assets.map((asset, index) => {
        const baseName = getBaseNameFromFileName(asset.fileName);
        const fallbackId = `item-${batchItems.length + index + 1}`;
        const itemId = normalizeItemId(baseName, fallbackId);

        return {
          localId: `${Date.now()}-${index}`,
          itemId,
          name: getDisplayNameFromItemId(itemId),
          backgroundColor: "",
          base64: asset.base64!,
          previewUri: asset.uri,
        };
      });

      setBatchItems((prev) => [...prev, ...nextItems]);
    } catch (error) {
      Alert.alert(
        "이미지 선택 실패",
        error instanceof Error ? error.message : "이미지를 선택하지 못했어요.",
      );
    }
  };

  const updateBatchItem = (localId: string, patch: Partial<BatchAdminItem>) => {
    setBatchItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeBatchItem = (localId: string) => {
    setBatchItems((prev) => prev.filter((item) => item.localId !== localId));
    setExpandedBatchItemIds((prev) => prev.filter((id) => id !== localId));
  };

  const toggleBatchItemDetail = (localId: string) => {
    setExpandedBatchItemIds((prev) =>
      prev.includes(localId)
        ? prev.filter((id) => id !== localId)
        : [...prev, localId],
    );
  };

  const handleAddTag = () => {
    const nextTags = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!nextTags.length) {
      tagInputRef.current?.focus();
      return;
    }

    setTags((prev) => {
      const existingTags = new Set(prev);
      const mergedTags = [...prev];

      nextTags.forEach((tag) => {
        if (!existingTags.has(tag)) {
          existingTags.add(tag);
          mergedTags.push(tag);
        }
      });

      return mergedTags;
    });
    setTagInput("");
    requestAnimationFrame(() => {
      tagInputRef.current?.focus();
    });
  };

  const handleRemoveTag = (targetTag: string) => {
    setTags((prev) => prev.filter((tag) => tag !== targetTag));
  };

  const handleChangeKind = (nextKind: AdminPackKind) => {
    setKind(nextKind);
    setCategory(nextKind === "sticker" ? "food" : "grid");
    setIsCategoryDropdownOpen(false);
  };

  const handleSelectCategory = (nextCategory: string) => {
    setCategory(nextCategory);
    setIsCategoryDropdownOpen(false);
  };

  const resetPackForm = () => {
    setPackId("");
    setTitle("");
    setKind("sticker");
    setStatus("priced");
    setCategory("food");
    setCoinPrice("1000");
    setDescription("");
    setThumbnailBase64(null);
    setThumbnailPreviewUri(null);
    setBatchItems([]);
    setExpandedBatchItemIds([]);
    setTagInput("");
    setTags([]);
    setIsCategoryDropdownOpen(false);
  };

  const saveBatchItemsForPack = async (
    targetPackId: string,
    updateProgress: (label: string) => void,
  ) => {
    for (const [index, item] of batchItems.entries()) {
      const itemId = item.itemId.trim();

      if (!itemId) {
        throw new Error("아이템 ID가 비어 있는 항목이 있어요.");
      }

      const imagePath = getPackItemImagePath({
        kind,
        packId: targetPackId,
        itemId,
      });

      updateProgress(`${index + 1}번째 아이템 이미지 업로드 중`);
      await uploadAdminAsset({
        path: imagePath,
        base64: item.base64,
        contentType: "image/png",
      });

      updateProgress(`${index + 1}번째 아이템 정보 저장 중`);
      await upsertAdminPackItem({
        id: itemId,
        packId: targetPackId,
        name: item.name.trim() || itemId,
        imagePath,
        backgroundColor:
          kind === "background" ? item.backgroundColor.trim() || null : null,
        sortOrder: index,
      });
    }
  };

  const handleSavePack = async () => {
    if (!packId.trim() || !title.trim()) {
      Alert.alert("입력 필요", "팩 ID와 제목은 꼭 입력해 주세요.");
      return;
    }

    const targetPackId = packId.trim();
    const totalSteps = (thumbnailBase64 ? 1 : 0) + 1 + batchItems.length * 2;
    let currentStep = 0;
    const updateProgress = (label: string) => {
      currentStep += 1;
      setSaveProgress({
        current: currentStep,
        total: totalSteps,
        label,
      });
    };

    setIsSaving(true);
    setSaveProgress({
      current: 0,
      total: totalSteps,
      label: "저장을 준비하는 중",
    });

    try {
      let thumbnailPath: string | null = null;

      if (thumbnailBase64) {
        thumbnailPath = getPackThumbnailPath({
          kind,
          packId: targetPackId,
        });

        updateProgress("썸네일 업로드 중");
        await uploadAdminAsset({
          path: thumbnailPath,
          base64: thumbnailBase64,
          contentType: "image/png",
        });
      }

      updateProgress("팩 정보 저장 중");
      await upsertAdminPack({
        id: targetPackId,
        kind,
        title: title.trim(),
        category,
        status,
        coinPrice: Number(coinPrice),
        thumbnailPath,
        description: description.trim() || null,
        tags,
      });

      if (batchItems.length > 0) {
        await saveBatchItemsForPack(targetPackId, updateProgress);
        Alert.alert(
          "저장 완료",
          `팩과 아이템 ${batchItems.length}개를 저장했어요.`,
        );
        resetPackForm();
        return;
      }

      Alert.alert("저장 완료", "팩이 저장되었어요.");
      resetPackForm();
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error
          ? error.message
          : "팩 저장 중 오류가 발생했어요.",
      );
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  if (!isLoaded) {
    return (
      <Screen>
        <AppText variant="body">불러오는 중...</AppText>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View>
          <AppText variant="h2">로그인이 필요해요</AppText>
          <AppButton label="로그인하기" onPress={() => router.push("/login")} />
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <View>
          <AppText variant="h2">관리자 권한이 없어요</AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text.primary}
            />
          </Pressable>
          <AppText variant="h1">팩 등록</AppText>
        </View>

        <AdminFieldGroup label="기본 정보" style={styles.group}>
          <TextInput
            value={packId}
            onChangeText={setPackId}
            placeholder="팩 ID(예: breakfast-pack)"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="팩 제목(예: 아침식사팩)"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="설명"
            placeholderTextColor={colors.text.muted}
            multiline
            style={[styles.input, styles.textarea]}
          />
        </AdminFieldGroup>

        <AdminFieldGroup
          label="태그"
          description="Enter 또는 추가 버튼으로 칩을 만들 수 있어요."
          style={styles.group}
        >
          <View style={styles.tagInputRow}>
            <TextInput
              ref={tagInputRef}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="태그 예: 귀염, 봄"
              placeholderTextColor={colors.text.muted}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={handleAddTag}
              style={[styles.input, styles.tagInput]}
            />
            <AppButton
              label="추가"
              variant="secondary"
              onPress={handleAddTag}
              disabled={!tagInput.trim() || isSaving}
            />
          </View>

          {tags.length > 0 ? (
            <View style={styles.tagChipRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <AppText variant="caption" style={styles.tagChipText}>
                    {tag}
                  </AppText>
                  <IconButton
                    imageSource={require("../../../assets/icons/x.png")}
                    size={18}
                    iconSize={7}
                    variant="ghost"
                    disabled={isSaving}
                    onPress={() => handleRemoveTag(tag)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="caption" style={styles.emptyTagText}>
              아직 추가된 태그가 없어요.
            </AppText>
          )}
        </AdminFieldGroup>

        <AdminFieldGroup label="팩 종류" style={styles.group}>
          <AdminSegmentedButtons
            value={kind}
            options={[
              { label: "스티커", value: "sticker" },
              { label: "배경", value: "background" },
            ]}
            onChange={handleChangeKind}
          />
        </AdminFieldGroup>

        <AdminFieldGroup label="카테고리" style={styles.group}>
          <Pressable
            onPress={() => setIsCategoryDropdownOpen((prev) => !prev)}
            style={({ pressed }) => [
              styles.dropdownTrigger,
              pressed && styles.dropdownTriggerPressed,
            ]}
          >
            <AppText variant="bodyStrong">
              {categoryLabelMap[category] ?? category}
            </AppText>
            <Ionicons
              name={isCategoryDropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.text.secondary}
            />
          </Pressable>

          {isCategoryDropdownOpen ? (
            <View style={styles.dropdownMenu}>
              {categoryOptions.map((item) => {
                const selected = item === category;

                return (
                  <Pressable
                    key={item}
                    onPress={() => handleSelectCategory(item)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      selected && styles.dropdownItemSelected,
                      pressed && styles.dropdownItemPressed,
                    ]}
                  >
                    <AppText
                      variant="body"
                      style={[
                        styles.dropdownItemText,
                        selected && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {categoryLabelMap[item] ?? item}
                    </AppText>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.accent.main}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </AdminFieldGroup>

        <AdminFieldGroup label="판매 상태" style={styles.group}>
          <AdminSegmentedButtons
            value={status}
            options={[
              { label: "무료", value: "free" },
              { label: "유료", value: "priced" },
            ]}
            onChange={setStatus}
          />
        </AdminFieldGroup>

        {status === "priced" ? (
          <AdminFieldGroup label="코인 가격" style={styles.group}>
            <TextInput
              value={coinPrice}
              onChangeText={setCoinPrice}
              placeholder="코인 가격"
              keyboardType="number-pad"
              placeholderTextColor={colors.text.muted}
              style={styles.input}
            />
          </AdminFieldGroup>
        ) : null}

        <AdminFieldGroup
          label="썸네일"
          description="상점 카드와 상세 화면에 표시돼요."
          style={styles.group}
        >
          <AppButton
            label={thumbnailPreviewUri ? "썸네일 다시 선택" : "썸네일 선택"}
            variant="secondary"
            onPress={handlePickThumbnail}
          />

          {thumbnailPreviewUri ? (
            <View style={styles.thumbnailPreviewCard}>
              <AppText variant="caption" style={styles.previewLabel}>
                선택된 썸네일
              </AppText>
              <Image
                source={{ uri: thumbnailPreviewUri }}
                style={styles.thumbnailPreviewImage}
              />
            </View>
          ) : null}
        </AdminFieldGroup>

        <AdminFieldGroup
          label="아이템 등록"
          description=" 현재 등록할 팩을 구성하는 아이템을 추가해 주세요."
          style={styles.group}
        >
          <AppButton
            label="이미지 여러 장 선택"
            variant="secondary"
            onPress={handlePickBatchImages}
          />

          {batchItems.length > 0 ? (
            <AppText variant="caption">
              선택된 아이템 {batchItems.length}개
            </AppText>
          ) : null}
        </AdminFieldGroup>

        {batchItems.length > 0 ? (
          <View style={styles.batchGrid}>
            {batchItems.map((item, index) => {
              const isDetailExpanded = expandedBatchItemIds.includes(
                item.localId,
              );

              return (
                <View key={item.localId} style={styles.batchItemCard}>
                  <AppText variant="bodyStrong">#{index + 1}</AppText>

                  <IconButton
                    imageSource={require("../../../assets/icons/pencil.png")}
                    size={20}
                    iconSize={10}
                    variant={isDetailExpanded ? "filledPinkSoft" : "filled"}
                    style={styles.batchEditButton}
                    disabled={isSaving}
                    onPress={() => toggleBatchItemDetail(item.localId)}
                  />
                  <IconButton
                    imageSource={require("../../../assets/icons/x.png")}
                    size={20}
                    iconSize={8}
                    variant="filled"
                    style={styles.batchRemoveButton}
                    disabled={isSaving}
                    onPress={() => removeBatchItem(item.localId)}
                  />

                  {item.previewUri ? (
                    <View style={styles.itemPreviewWrapper}>
                      <Image
                        source={{ uri: item.previewUri }}
                        style={styles.itemPreviewImage}
                      />
                    </View>
                  ) : null}

                  <AppText variant="caption">아이템 이름</AppText>
                  <TextInput
                    value={item.name}
                    onChangeText={(value) =>
                      updateBatchItem(item.localId, { name: value })
                    }
                    placeholder="아이템 이름"
                    placeholderTextColor={colors.text.muted}
                    style={styles.input}
                  />

                  {isDetailExpanded ? (
                    <View style={styles.batchDetailArea}>
                      <AppText variant="caption">아이템 ID</AppText>
                      <TextInput
                        value={item.itemId}
                        onChangeText={(value) =>
                          updateBatchItem(item.localId, { itemId: value })
                        }
                        placeholder="아이템 ID"
                        placeholderTextColor={colors.text.muted}
                        autoCapitalize="none"
                        style={styles.input}
                      />

                      {kind === "background" ? (
                        <>
                          <AppText variant="caption">배경색</AppText>
                          <TextInput
                            value={item.backgroundColor}
                            onChangeText={(value) =>
                              updateBatchItem(item.localId, {
                                backgroundColor: value,
                              })
                            }
                            placeholder="#FFF5E3"
                            placeholderTextColor={colors.text.muted}
                            autoCapitalize="none"
                            style={styles.input}
                          />
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <AppButton
          label={
            isSaving
              ? "저장 중..."
              : batchItems.length > 0
                ? `팩과 아이템 ${batchItems.length}개 저장`
                : "팩 저장"
          }
          onPress={handleSavePack}
          disabled={isSaving}
        />
        {saveProgress ? (
          <View style={styles.progressCard}>
            <View style={styles.progressTextRow}>
              <AppText variant="caption" style={styles.progressLabel}>
                {saveProgress.label}
              </AppText>
              <AppText variant="caption" style={styles.progressCount}>
                {saveProgress.current}/{saveProgress.total}
              </AppText>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.round(
                        (saveProgress.current / saveProgress.total) * 100,
                      ),
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

export default AdminPackFormScreen;

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  description: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  group: {
    marginBottom: spacing.md,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.surface,
    color: colors.text.primary,
    fontFamily: "Iseoyun",
    fontSize: 16,
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tagInput: {
    flex: 1,
  },
  tagChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: spacing.sm,
    paddingRight: 2,
    paddingVertical: 4,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.subtle,
  },
  tagChipText: {
    color: colors.text.secondary,
  },
  emptyTagText: {
    color: colors.text.muted,
  },
  dropdownTrigger: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dropdownTriggerPressed: {
    opacity: 0.8,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    backgroundColor: colors.background.surface,
    overflow: "hidden",
  },
  dropdownItem: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dropdownItemSelected: {
    backgroundColor: colors.accent.soft,
  },
  dropdownItemPressed: {
    opacity: 0.75,
  },
  dropdownItemText: {
    color: colors.text.primary,
  },
  dropdownItemTextSelected: {
    color: colors.accent.main,
  },
  textarea: {
    minHeight: 96,
    paddingVertical: spacing.sm,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  buttonWrapper: {
    marginTop: spacing.md,
  },
  batchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  batchItemCard: {
    width: "48%",
    position: "relative",
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.base,
    gap: spacing.sm,
  },
  batchRemoveButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    zIndex: 1,
  },
  batchEditButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xxl,
    zIndex: 1,
  },
  batchDetailArea: {
    gap: spacing.sm,
  },
  thumbnailPreviewCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  thumbnailPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    resizeMode: "cover",
    backgroundColor: colors.background.subtle,
  },
  itemPreviewWrapper: {
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  itemPreviewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    resizeMode: "contain",
  },
  previewLabel: {
    opacity: 0.8,
  },
  progressCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.surface,
    gap: spacing.sm,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  progressLabel: {
    flex: 1,
  },
  progressCount: {
    color: colors.text.secondary,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.round,
    backgroundColor: colors.background.subtle,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.round,
    backgroundColor: colors.accent.main,
  },
});
