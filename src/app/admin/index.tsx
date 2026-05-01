import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
} from "../../services/adminShopPackService";
import { pickAdminAssetImage } from "../../utils/pickAdminAssetImage";
import {
  getPackThumbnailPath,
  uploadAdminAsset,
} from "../../services/adminAssetUploadService";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

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

  const categoryOptions = useMemo(() => {
    return kind === "sticker"
      ? ["food", "deco", "etc"]
      : ["grid", "check", "deco", "landscape"];
  }, [kind]);

  const handlePickThumbnail = async () => {
    try {
      const asset = await pickAdminAssetImage();

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

  const handleSavePack = async () => {
    if (!packId.trim() || !title.trim()) {
      Alert.alert("입력 필요", "팩 ID와 제목은 꼭 입력해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      let thumbnailPath: string | null = null;

      if (thumbnailBase64) {
        thumbnailPath = getPackThumbnailPath({
          kind,
          packId: packId.trim(),
        });

        await uploadAdminAsset({
          path: thumbnailPath,
          base64: thumbnailBase64,
          contentType: "image/png",
        });
      }

      await upsertAdminPack({
        id: packId.trim(),
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
        <AppText variant="h1">관리자</AppText>
        <AppText variant="caption" style={styles.description}>
          스티커팩/배경팩을 등록해요.
        </AppText>

        <View style={styles.section}>
          <AppText variant="title">팩 정보</AppText>

          <TextInput
            value={packId}
            onChangeText={setPackId}
            placeholder="팩 ID 예: breakfast-pack"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="팩 제목 예: 아침식사팩"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
          />

          <View style={styles.row}>
            <AppButton
              label="스티커"
              variant={kind === "sticker" ? "primary" : "secondary"}
              onPress={() => {
                setKind("sticker");
                setCategory("food");
              }}
            />
            <AppButton
              label="배경"
              variant={kind === "background" ? "primary" : "secondary"}
              onPress={() => {
                setKind("background");
                setCategory("grid");
              }}
            />
          </View>

          <View style={styles.chipRow}>
            {categoryOptions.map((item) => (
              <AppButton
                key={item}
                label={item}
                variant={category === item ? "primary" : "secondary"}
                onPress={() => setCategory(item)}
              />
            ))}
          </View>

          <View style={styles.row}>
            <AppButton
              label="무료"
              variant={status === "free" ? "primary" : "secondary"}
              onPress={() => setStatus("free")}
            />
            <AppButton
              label="유료"
              variant={status === "priced" ? "primary" : "secondary"}
              onPress={() => setStatus("priced")}
            />
          </View>

          {status === "priced" ? (
            <TextInput
              value={coinPrice}
              onChangeText={setCoinPrice}
              placeholder="코인 가격"
              keyboardType="number-pad"
              placeholderTextColor={colors.text.muted}
              style={styles.input}
            />
          ) : null}

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="설명"
            placeholderTextColor={colors.text.muted}
            multiline
            style={[styles.input, styles.textarea]}
          />

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

          <View style={styles.buttonWrapper}>
            <AppButton
              label={thumbnailPreviewUri ? "썸네일 다시 선택" : "썸네일 선택"}
              variant="secondary"
              onPress={handlePickThumbnail}
            />
          </View>

          <View style={styles.buttonWrapper}>
            <AppButton
              label={isSaving ? "저장 중..." : "팩 저장"}
              onPress={handleSavePack}
              disabled={isSaving}
            />
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <AppButton
            label="아이템 등록으로 이동"
            variant="secondary"
            onPress={() => router.push("/admin/items")}
          />
        </View>
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
});
