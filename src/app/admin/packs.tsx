import { Alert, FlatList, Image, StyleSheet, View } from "react-native";
import React, { useCallback, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useShopPackStore } from "../../store/shopPackStore";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/common/AppText";
import Screen from "../../components/common/Screen";
import AppButton from "../../components/common/AppButton";
import IconButton from "../../components/common/IconButton";
import Chip from "../../components/common/Chip";
import { ShopPack } from "../../types/shop";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { deleteAdminPack } from "../../services/adminShopPackService";

type PackKindFilter = "all" | "sticker" | "background";

const kindFilters: { label: string; value: PackKindFilter }[] = [
  { label: "전체", value: "all" },
  { label: "스티커", value: "sticker" },
  { label: "배경", value: "background" },
];

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

const AdminPacksScreen = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoaded = useAuthStore((state) => state.isLoaded);

  const packs = useShopPackStore((state) => state.packs);
  const isLoading = useShopPackStore((state) => state.isLoading);
  const errorMessage = useShopPackStore((state) => state.errorMessage);
  const loadPacks = useShopPackStore((state) => state.loadPacks);

  const isAdmin = profile?.role === "admin";
  const [selectedKind, setSelectedKind] = useState<PackKindFilter>("all");

  const filteredPacks = useMemo(() => {
    if (selectedKind === "all") return packs;
    return packs.filter((pack) => pack.kind === selectedKind);
  }, [packs, selectedKind]);

  useFocusEffect(
    useCallback(() => {
      if (user && isAdmin) {
        void loadPacks();
      }
    }, [user, isAdmin, loadPacks]),
  );

  const handleDeletePack = (pack: ShopPack) => {
    Alert.alert(
      "팩 삭제",
      `${pack.title} 팩을 삭제할까요?\n\n등록된 아이템도 함께 삭제돼요.`,
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAdminPack(pack.id);
              await loadPacks();

              Alert.alert("삭제 완료", "팩이 삭제되었어요.");
            } catch (error) {
              Alert.alert(
                "삭제 실패",
                error instanceof Error
                  ? error.message
                  : "팩 삭제 중 오류가 발생했어요.",
              );
            }
          },
        },
      ],
    );
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
        <View style={styles.center}>
          <AppText variant="h2">관리자 권한이 필요해요</AppText>
          <View style={styles.buttonWrapper}>
            <AppButton
              label="관리자 홈으로"
              onPress={() => router.replace("/admin")}
            />
          </View>
        </View>
      </Screen>
    );
  }
  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="h1">팩 관리</AppText>
        <AppText variant="caption" style={styles.description}>
          등록된 스티커팩/배경팩을 확인해요.
        </AppText>

        <View style={styles.buttonWrapper}>
          <AppButton
            label="새 팩 등록"
            onPress={() => router.push("/admin/pack-form")}
          />
        </View>

        <View style={styles.filterRow}>
          {kindFilters.map((filter) => (
            <Chip
              key={filter.value}
              label={filter.label}
              selected={selectedKind === filter.value}
              onPress={() => setSelectedKind(filter.value)}
            />
          ))}
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.empty}>
          <AppText variant="h3">팩 목록을 불러오지 못했어요</AppText>
          <AppText variant="caption" style={styles.description}>
            {errorMessage}
          </AppText>
          <View style={styles.buttonWrapper}>
            <AppButton label="다시 시도" onPress={() => void loadPacks()} />
          </View>
        </View>
      ) : isLoading ? (
        <AppText variant="body">팩 목록을 불러오는 중...</AppText>
      ) : (
        <FlatList
          data={filteredPacks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AdminPackListItem
              pack={item}
              onDelete={() => handleDeletePack(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="h3">등록된 팩이 없어요</AppText>
              <AppText variant="caption" style={styles.description}>
                {selectedKind === "all"
                  ? "새 팩을 먼저 등록해 보세요."
                  : "선택한 종류의 팩이 없어요."}
              </AppText>
            </View>
          }
        />
      )}
    </Screen>
  );
};

export default AdminPacksScreen;

function AdminPackListItem({
  pack,
  onDelete,
}: {
  pack: ShopPack;
  onDelete: () => void;
}) {
  const kindLabel = pack.kind === "sticker" ? "스티커" : "배경";
  const categoryLabel = categoryLabelMap[pack.category] ?? pack.category;
  const statusLabel =
    pack.status === "free" ? "무료" : `${pack.coinPrice ?? 0}코인`;

  return (
    <View style={styles.packCard}>
      <IconButton
        imageSource={require("../../../assets/icons/x.png")}
        size={32}
        iconSize={16}
        variant="filled"
        style={styles.deleteIconButton}
        onPress={onDelete}
      />
      <IconButton
        imageSource={require("../../../assets/icons/pencil.png")}
        size={32}
        iconSize={16}
        variant="filled"
        style={styles.editIconButton}
        onPress={() => router.push(`/admin/pack-form?id=${pack.id}`)}
      />

      <View style={styles.packContentRow}>
        <View style={styles.thumbnailBox}>
          {pack.thumbnailSource ? (
            <Image
              source={pack.thumbnailSource}
              style={styles.thumbnailImage}
            />
          ) : (
            <AppText variant="small" style={styles.thumbnailPlaceholderText}>
              이미지 없음
            </AppText>
          )}
        </View>

        <View style={styles.packInfo}>
          <View style={styles.packHeader}>
            <AppText variant="title" style={styles.packTitle}>
              {pack.title}
            </AppText>

            <View style={styles.badge}>
              <AppText variant="small" style={styles.badgeText}>
                {kindLabel}
              </AppText>
            </View>
          </View>

          <AppText variant="caption" style={styles.packMeta}>
            ID: {pack.id}
          </AppText>

          <AppText variant="caption" style={styles.packMeta}>
            {categoryLabel} / {statusLabel}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  description: {
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  buttonWrapper: {
    marginTop: spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  packCard: {
    position: "relative",
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    gap: spacing.xs,
  },
  packContentRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  thumbnailBox: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.background.subtle,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholderText: {
    color: colors.text.muted,
    textAlign: "center",
  },
  packInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  packHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  packTitle: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.round,
    backgroundColor: colors.background.subtle,
  },
  badgeText: {
    color: colors.text.secondary,
  },
  packMeta: {
    opacity: 0.8,
  },
  editIconButton: {
    position: "absolute",
    right: 50,
    bottom: spacing.md,
    zIndex: 1,
  },
  deleteIconButton: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    zIndex: 1,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
});
