import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  View,
} from "react-native";
import React, { useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
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
  sortOrder: string;
  backgroundColor: string;
  base64: string;
  previewUri: string;
}

const AdminScreen = () => {
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
  const [sortOrder, setSortOrder] = useState("0");
  const [isNew, setIsNew] = useState(false);
  const [thumbnailBase64, setThumbnailBase64] = useState<string | null>(null);
  const [thumbnailPreviewUri, setThumbnailPreviewUri] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

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

  const categoryOptions = useMemo(() => {
    return kind === "sticker"
      ? ["food", "deco", "etc"]
      : ["grid", "check", "deco", "landscape"];
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
          sortOrder: String(batchItems.length + index),
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
  };

  const saveBatchItemsForPack = async (targetPackId: string) => {
    for (const item of batchItems) {
      const itemId = item.itemId.trim();

      if (!itemId) {
        throw new Error("아이템 ID가 비어 있는 항목이 있어요.");
      }

      const imagePath = getPackItemImagePath({
        kind,
        packId: targetPackId,
        itemId,
      });

      await uploadAdminAsset({
        path: imagePath,
        base64: item.base64,
        contentType: "image/png",
      });

      await upsertAdminPackItem({
        id: itemId,
        packId: targetPackId,
        name: item.name.trim() || itemId,
        imagePath,
        backgroundColor:
          kind === "background" ? item.backgroundColor.trim() || null : null,
        sortOrder: Number(item.sortOrder),
      });
    }
  };

  const handleSavePack = async () => {
    if (!packId.trim() || !title.trim()) {
      Alert.alert("입력 필요", "팩 ID와 제목은 꼭 입력해 주세요.");
      return;
    }

    const targetPackId = packId.trim();

    setIsSaving(true);

    try {
      let thumbnailPath: string | null = null;

      if (thumbnailBase64) {
        thumbnailPath = getPackThumbnailPath({
          kind,
          packId: targetPackId,
        });

        await uploadAdminAsset({
          path: thumbnailPath,
          base64: thumbnailBase64,
          contentType: "image/png",
        });
      }

      await upsertAdminPack({
        id: targetPackId,
        kind,
        title: title.trim(),
        category,
        status,
        coinPrice: Number(coinPrice),
        thumbnailPath,
        description: description.trim() || null,
        isNew,
        sortOrder: Number(sortOrder),
      });

      if (batchItems.length > 0) {
        await saveBatchItemsForPack(targetPackId);
        Alert.alert(
          "저장 완료",
          `팩과 아이템 ${batchItems.length}개를 저장했어요.`,
        );
        setBatchItems([]);
        return;
      }

      Alert.alert("저장 완료", "팩이 저장되었어요.");
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error
          ? error.message
          : "팩 저장 중 오류가 발생했어요.",
      );
    } finally {
      setIsSaving(false);
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
        <AppText variant="h1">팩 등록</AppText>

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

        <AdminFieldGroup label="팩 종류" style={styles.group}>
          <AdminSegmentedButtons
            value={kind}
            options={[
              { label: "스티커", value: "sticker" },
              { label: "배경", value: "background" },
            ]}
            onChange={(nextKind) => {
              setKind(nextKind);
              setCategory(nextKind === "sticker" ? "food" : "grid");
            }}
          />
        </AdminFieldGroup>

        <AdminFieldGroup label="카테고리" style={styles.group}>
          <AdminSegmentedButtons
            value={category}
            options={categoryOptions.map((item) => ({
              label: item,
              value: item,
            }))}
            onChange={setCategory}
          />
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

        <AdminFieldGroup label="정렬/신규 표시" style={styles.group}>
          <TextInput
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder="정렬 순서"
            keyboardType="number-pad"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
          />

          <AppButton
            label={isNew ? "신규 표시 ON" : "신규 표시 OFF"}
            variant={isNew ? "primary" : "secondary"}
            onPress={() => setIsNew((prev) => !prev)}
          />
        </AdminFieldGroup>

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

        {batchItems.map((item, index) => (
          <View key={item.localId} style={[styles.batchItemCard, styles.group]}>
            <AppText variant="bodyStrong">#{index + 1}</AppText>

            {item.previewUri ? (
              <View style={styles.itemPreviewWrapper}>
                <AppText variant="caption" style={styles.previewLabel}>
                  선택된 이미지
                </AppText>
                <Image
                  source={{ uri: item.previewUri }}
                  style={styles.itemPreviewImage}
                />
              </View>
            ) : null}

            <AppText variant='caption'>아이템 ID</AppText>
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

             <AppText variant='caption'>아이템 이름</AppText>
            <TextInput
              value={item.name}
              onChangeText={(value) =>
                updateBatchItem(item.localId, { name: value })
              }
              placeholder="아이템 이름"
              placeholderTextColor={colors.text.muted}
              style={styles.input}
            />

              <AppText variant='caption'>정렬 순서</AppText>
            <TextInput
              value={item.sortOrder}
              onChangeText={(value) =>
                updateBatchItem(item.localId, { sortOrder: value })
              }
              placeholder="정렬 순서"
              keyboardType="number-pad"
              placeholderTextColor={colors.text.muted}
              style={styles.input}
            />

            {kind === "background" ? (
              <TextInput
                value={item.backgroundColor}
                onChangeText={(value) =>
                  updateBatchItem(item.localId, { backgroundColor: value })
                }
                placeholder="#FFF5E3"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="none"
                style={styles.input}
              />
            ) : null}

            <AppButton
              label="이 아이템 제거"
              variant="secondary"
              onPress={() => removeBatchItem(item.localId)}
            />
          </View>
        ))}

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
      </ScrollView>
    </Screen>
  );
};

export default AdminScreen;

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
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
  batchItemCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.base,
    gap: spacing.sm,
  },
  thumbnailPreviewCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  thumbnailPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    resizeMode: 'cover',
    backgroundColor: colors.background.subtle,
  },
  itemPreviewWrapper: {
    gap: spacing.xs,
    alignItems: 'flex-start'
  },
  itemPreviewImage: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    resizeMode: 'contain',
  },
  previewLabel: {
    opacity: 0.8
  }
});
