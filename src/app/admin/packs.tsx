import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
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
import {
  backgroundCategoryOptions,
  packCategoryLabelMap,
  stickerCategoryOptions,
} from "../../constants/packCategories";
import { deleteAdminPack } from "../../services/adminShopPackService";
import { Ionicons } from "@expo/vector-icons";

type PackKindFilter = "all" | "sticker" | "background";
type PackActiveFilter = "all" | "active" | "inactive";
type PackCategoryFilter = "all" | string;

const kindFilters: { label: string; value: PackKindFilter }[] = [
  { label: "전체", value: "all" },
  { label: "스티커", value: "sticker" },
  { label: "배경", value: "background" },
];

const activeFilters: { label: string; value: PackActiveFilter }[] = [
  { label: "전체 상태", value: "all" },
  { label: "활성", value: "active" },
  { label: "비활성", value: "inactive" },
];

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
  const [selectedActive, setSelectedActive] = useState<PackActiveFilter>("all");
  const [selectedCategory, setSelectedCategory] =
    useState<PackCategoryFilter>("all");
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);

  const categoryFilters = useMemo(() => {
    if (selectedKind === "sticker") return stickerCategoryOptions;
    if (selectedKind === "background") return backgroundCategoryOptions;
    return [];
  }, [selectedKind]);

  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      if (selectedKind !== "all" && pack.kind !== selectedKind) return false;
      if (selectedActive === "active") return pack.isActive !== false;
      if (selectedActive === "inactive") return pack.isActive === false;
      if (
        selectedKind !== "all" &&
        selectedCategory !== "all" &&
        pack.category !== selectedCategory
      ) {
        return false;
      }
      return true;
    });
  }, [packs, selectedActive, selectedCategory, selectedKind]);

  useFocusEffect(
    useCallback(() => {
      if (user && isAdmin) {
        void loadPacks({ includeInactive: true });
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
            if (deletingPackId) return;

            try {
              setDeletingPackId(pack.id);
              await deleteAdminPack(pack.id);
              await loadPacks({ includeInactive: true });

              Alert.alert("삭제 완료", "팩이 삭제되었어요.");
            } catch (error) {
              Alert.alert(
                "삭제 실패",
                error instanceof Error
                  ? error.message
                  : "팩 삭제 중 오류가 발생했어요.",
              );
            } finally {
              setDeletingPackId(null);
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
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace('/admin')}
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
          <AppText variant="h1">팩 관리</AppText>
          <AppText variant="caption" style={styles.description}>
            등록된 스티커팩/배경팩을 확인해요.
          </AppText>
        </View>

        <View style={styles.buttonWrapper}>
          <AppButton
            label="새 팩 등록"
            onPress={() => router.replace("/admin/pack-form")}
          />
        </View>

        <View style={styles.kindFilterRow}>
          {kindFilters.map((filter) => (
            <Chip
              key={filter.value}
              label={filter.label}
              selected={selectedKind === filter.value}
              onPress={() => {
                setSelectedKind(filter.value);
                setSelectedCategory("all");
              }}
            />
          ))}
        </View>

        <View style={styles.statusFilterBox}>
          <AppText variant="caption" style={styles.statusFilterLabel}>
            노출 상태
          </AppText>
          <View style={styles.statusFilterRow}>
            {activeFilters.map((filter) => {
              const selected = selectedActive === filter.value;

              return (
                <Pressable
                  key={filter.value}
                  onPress={() => setSelectedActive(filter.value)}
                  style={({ pressed }) => [
                    styles.statusFilterButton,
                    selected && styles.statusFilterButtonSelected,
                    pressed && styles.statusFilterButtonPressed,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.statusFilterText,
                      selected && styles.statusFilterTextSelected,
                    ]}
                  >
                    {filter.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedKind !== "all" ? (
          <View style={styles.categoryFilterBox}>
            <AppText variant="caption" style={styles.statusFilterLabel}>
              카테고리
            </AppText>
            <View style={styles.categoryFilterRow}>
              <Chip
                label="전체 카테고리"
                selected={selectedCategory === "all"}
                onPress={() => setSelectedCategory("all")}
              />
              {categoryFilters.map((category) => (
                <Chip
                  key={category}
                  label={packCategoryLabelMap[category] ?? category}
                  selected={selectedCategory === category}
                  onPress={() => setSelectedCategory(category)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {errorMessage ? (
        <View style={styles.empty}>
          <AppText variant="h3">팩 목록을 불러오지 못했어요</AppText>
          <AppText variant="caption" style={styles.description}>
            {errorMessage}
          </AppText>
          <View style={styles.buttonWrapper}>
            <AppButton
              label="다시 시도"
              onPress={() => void loadPacks({ includeInactive: true })}
            />
          </View>
        </View>
      ) : isLoading ? (
        <AppText variant="body">팩 목록을 불러오는 중...</AppText>
      ) : (
        <>
          <AppText variant="body" style={{ marginBottom: spacing.sm }}>
            총 {filteredPacks.length}개의 팩
          </AppText>
          <FlatList
            data={filteredPacks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AdminPackListItem
                pack={item}
                isDeleting={deletingPackId === item.id}
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
                    ? "조건에 맞는 팩이 없어요."
                    : "선택한 조건의 팩이 없어요."}
                </AppText>
              </View>
            }
          />
        </>
      )}
    </Screen>
  );
};

export default AdminPacksScreen;

function AdminPackListItem({
  pack,
  isDeleting,
  onDelete,
}: {
  pack: ShopPack;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const kindLabel = pack.kind === "sticker" ? "스티커" : "배경";
  const categoryLabel = packCategoryLabelMap[pack.category] ?? pack.category;
  const statusLabel =
    pack.status === "free" ? "무료" : `${pack.coinPrice ?? 0}코인`;
  const isInactive = pack.isActive === false;

  return (
    <View style={styles.packCard}>
      <IconButton
        imageSource={require("../../../assets/icons/x.png")}
        size={32}
        iconSize={16}
        variant="filled"
        style={styles.deleteIconButton}
        disabled={isDeleting}
        onPress={onDelete}
      />
      <IconButton
        imageSource={require("../../../assets/icons/pencil.png")}
        size={32}
        iconSize={16}
        variant="filled"
        style={styles.editIconButton}
        disabled={isDeleting}
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
            {isInactive ? (
              <View style={[styles.badge, styles.inactiveBadge]}>
                <AppText variant="small" style={styles.inactiveBadgeText}>
                  비활성
                </AppText>
              </View>
            ) : null}
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
    opacity: 0.8,
  },
  buttonWrapper: {
    marginTop: spacing.md,
  },
  kindFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statusFilterBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.surface,
    gap: spacing.xs,
  },
  statusFilterLabel: {
    color: colors.text.muted,
  },
  statusFilterRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  statusFilterButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.subtle,
  },
  statusFilterButtonSelected: {
    backgroundColor: colors.accent.main,
  },
  statusFilterButtonPressed: {
    opacity: 0.75,
  },
  statusFilterText: {
    color: colors.text.secondary,
  },
  statusFilterTextSelected: {
    color: colors.text.inverse,
  },
  categoryFilterBox: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  categoryFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
  inactiveBadge: {
    backgroundColor: colors.background.subtle,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inactiveBadgeText: {
    color: colors.text.muted,
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
