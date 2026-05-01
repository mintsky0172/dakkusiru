import { Alert, ScrollView, StyleSheet, TextInput, View } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useShopPackStore } from "../../store/shopPackStore";
import { pickAdminAssetImage } from "../../utils/pickAdminAssetImage";
import {
  getPackItemImagePath,
  uploadAdminAsset,
} from "../../services/adminAssetUploadService";
import { upsertAdminPackItem } from "../../services/adminShopPackService";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import { router } from "expo-router";
import AppButton from "../../components/common/AppButton";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

const AdminPackItemsScreen = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoaded = useAuthStore((state) => state.isLoaded);

  const packs = useShopPackStore((state) => state.packs);
  const loadPacks = useShopPackStore((state) => state.loadPacks);

  const isAdmin = profile?.role === "admin";

  const [selectedPackId, setSelectedPackId] = useState("");
  const [itemId, setItemId] = useState("");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadPacks();
  }, [loadPacks]);

  const selectedPack = useMemo(() => {
    return packs.find((pack) => pack.id === selectedPackId) ?? null;
  }, [packs, selectedPackId]);

  const handlePickImage = async () => {
    try {
      const assets = await pickAdminAssetImage();
      const asset = assets[0];

      if (!asset) return;

      setImageBase64(asset.base64 ?? null);
    } catch (error) {
      Alert.alert(
        "이미지 선택 실패",
        error instanceof Error ? error.message : "이미지를 선택하지 못했어요.",
      );
    }
  };

  const handleSaveItem = async () => {
    if (!selectedPack) {
      Alert.alert("팩 선택 필요", "아이템을 추가할 팩을 선택해 주세요.");
      return;
    }

    if (!itemId.trim() || !name.trim()) {
      Alert.alert("입력 필요", "아이템 ID와 이름은 꼭 입력해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      let imagePath: string | null = null;

      if (imageBase64) {
        imagePath = getPackItemImagePath({
          kind: selectedPack.kind,
          packId: selectedPack.id,
          itemId: itemId.trim(),
        });

        await uploadAdminAsset({
          path: imagePath,
          base64: imageBase64,
          contentType: "image/png",
        });
      }

      await upsertAdminPackItem({
        id: itemId.trim(),
        packId: selectedPack.id,
        name: name.trim(),
        imagePath,
        backgroundColor: backgroundColor.trim() || null,
        sortOrder: Number(sortOrder),
      });

      Alert.alert("저장 완료", "아이템이 저장되었어요");
      setItemId("");
      setName("");
      setSortOrder("0");
      setBackgroundColor("");
      setImageBase64(null);
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error
          ? error.message
          : "아이템 저장 중 오류가 발생했어요.",
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

  if (!user || !isAdmin) {
    return (
      <Screen>
        <AppText variant="h2">관리자 권한이 필요해요</AppText>
        <AppButton label="돌아가기" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AppText variant="h1">아이템 등록</AppText>

        <View style={styles.section}>
          <AppText variant="title">팩 선택</AppText>

          <View style={styles.chipRow}>
            {packs.map((pack) => (
              <AppButton
                key={pack.id}
                label={pack.title}
                variant={selectedPackId === pack.id ? "primary" : "secondary"}
                onPress={() => setSelectedPackId(pack.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="title">아이템 정보</AppText>

          <TextInput
            value={itemId}
            onChangeText={setItemId}
            placeholder="아이템 ID 예: toast"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="아이템 이름 예: 토스트"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
          />
          <TextInput
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder="정렬 순서"
            keyboardType="number-pad"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
          />

          {selectedPack?.kind === "background" ? (
            <TextInput
              value={backgroundColor}
              onChangeText={setBackgroundColor}
              placeholder="단색 배경이면 컬러 예: #FFF5E3"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              style={styles.input}
            />
          ) : null}

          <AppButton
            label={imageBase64 ? "이미지 다시 선택" : "이미지 선택"}
            variant="secondary"
            onPress={handlePickImage}
          />

          <View style={styles.buttonWrapper}>
            <AppButton
              label={isSaving ? "저장 중..." : "아이템 저장"}
              onPress={handleSaveItem}
              disabled={isSaving}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

export default AdminPackItemsScreen;

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
  buttonWrapper: {
    marginTop: spacing.md,
  },
});
