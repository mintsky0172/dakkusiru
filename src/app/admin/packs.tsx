import { FlatList, StyleSheet, Text, View } from "react-native";
import React, { use, useCallback } from "react";
import { useAuthStore } from "../../store/authStore";
import { useShopPackStore } from "../../store/shopPackStore";
import { router, useFocusEffect } from "expo-router";
import { AppText } from "../../components/common/AppText";
import Screen from "../../components/common/Screen";
import AppButton from "../../components/common/AppButton";
import { ShopPack } from "../../types/shop";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";

const AdminPacksScreen = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoaded = useAuthStore((state) => state.isLoaded);

  const packs = useShopPackStore((state) => state.packs);
  const isLoading = useShopPackStore((state) => state.isLoading);
  const loadPacks = useShopPackStore((state) => state.loadPacks);

  const isAdmin = profile?.role === "admin";

  useFocusEffect(
    useCallback(() => {
      if (user && isAdmin) {
        void loadPacks();
      }
    }, [user, isAdmin, loadPacks]),
  );

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
      </View>

      {isLoading ? (
        <AppText variant="body">팩 목록을 불러오는 중...</AppText>
      ) : (
        <FlatList
          data={packs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AdminPackListItem pack={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="h3">등록된 팩이 없어요</AppText>
              <AppText variant="caption" style={styles.description}>
                새 팩을 먼저 등록해 보세요.
              </AppText>
            </View>
          }
        />
      )}
    </Screen>
  );
};

export default AdminPacksScreen;

function AdminPackListItem({ pack }: { pack: ShopPack }) {
  const kindLabel = pack.kind === "sticker" ? "스티커" : "배경";
  const statusLabel =
    pack.status === "free" ? "무료" : `${pack.coinPrice ?? 0}코인`;

  return (
    <View style={styles.packCard}>
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
        {pack.category} / {statusLabel}
      </AppText>

      <View style={styles.cardButtonRow}>
        <AppButton
          label="수정"
          variant="secondary"
          onPress={() => router.push(`/admin/pack-form?id=${pack.id}`)}
        />
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
  listContent: {
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  packCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
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
  cardButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
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
