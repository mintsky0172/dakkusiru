import { Alert, ScrollView, StyleSheet, Image, View } from "react-native";
import React, { useEffect, useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { mockPacks } from "../../mocks/shop";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import { radius, spacing } from "../../constants/spacing";
import AppButton from "../../components/common/AppButton";
import IconButton from "../../components/common/IconButton";
import StickerPreviewCard from "../../components/shop/StickerPreviewCard";
import { colors } from "../../constants/colors";
import { usePurchaseStore } from "../../store/purchaseStore";

const PackDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  const userCoinBalance = 10000; // TODO: 유저 코인 잔액 스토어에서 불러오기

  const ownedPackIds = usePurchaseStore((state) => state.ownedPackIds);
  const loadOwnedPackIds = usePurchaseStore((state) => state.loadOwnedPackIds);
  const markPackAsOwned = usePurchaseStore((state) => state.markPackAsOwned);

  useEffect(() => {
    void loadOwnedPackIds();
  }, [loadOwnedPackIds]);

  const rawPack = useMemo(() => {
    return mockPacks.find((item) => item.id === id);
  }, [id]);

  const pack = useMemo(() => {
    if (!rawPack) return null;
    return mockPacks.find((item) => item.id === id);
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  const handlePrimaryAction = async () => {
    if (!pack) return;

    if (pack.ownStatus === "owned" || pack.status === "free") {
      Alert.alert("이 팩 사용하기:", pack.id);
      // TODO: 나중엔 editor 쪽으로 연결
      return;
    }

    // 임시 구매 성공 처리
    await markPackAsOwned(pack.id);
  };

  //   const requiredCoins = 1000; // TODO: pack price 숫자화
  //   if (userCoinBalance < requiredCoins) {
  //     Alert.alert(
  //       "코인 부족",
  //       "보유 코인이 부족해요. 충전 화면으로 이동할까요?",
  //       [
  //         {
  //           text: "Cancel",
  //           onPress: () => {},
  //           style: "cancel",
  //         },
  //         {
  //           text: "OK",
  //           onPress: () => router.push("/coin"),
  //           style: "destructive",
  //         },
  //       ],
  //     );
  //     return;
  //   }

  //   Alert.alert("팩 구매하기:", pack.id);
  //   // TODO : 구매 로직 연결
  // };

  if (!pack) {
    return (
      <Screen>
        <View style={styles.notFoundContainer}>
          <AppText variant="h2">존재하지 않는 팩이에요.</AppText>
          <View style={{ marginTop: spacing.lg }}>
            <AppButton label="상점으로 돌아가기" onPress={handleBack} />
          </View>
        </View>
      </Screen>
    );
  }

  const primaryLabel =
    pack.ownStatus === "owned"
      ? "사용하기"
      : pack.status === "free"
        ? "무료로 받기"
        : `${pack.priceLabel}에 구매하기`;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.topBar}>
          <IconButton
            imageSource={require("../../../assets/icons/back.png")}
            onPress={handleBack}
            variant="ghost"
            size={40}
            iconSize={20}
          />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroImageWrapper}>
            {pack.thumbnailSource ? (
              <Image source={pack.thumbnailSource} style={styles.heroImage} />
            ) : (
              <View style={styles.heroPlaceholder} />
            )}
          </View>

          <View style={styles.heroTextArea}>
            <View style={styles.titleRow}>
              <AppText variant="h2" style={styles.packTitle}>
                {pack.title}
              </AppText>

              {pack.isNew ? (
                <View style={styles.newBadge}>
                  <AppText variant="small" style={styles.newBadgeText}>
                    신규
                  </AppText>
                </View>
              ) : null}
            </View>

            {!!pack.description && (
              <AppText variant="caption" style={styles.description}>
                {pack.description}
              </AppText>
            )}

            <View style={styles.statusRow}>
              {pack.ownStatus === "owned" ? (
                <View style={[styles.statusBadge, styles.ownedBadge]}>
                  <AppText variant="small" style={styles.ownedBadgeText}>
                    보유중
                  </AppText>
                </View>
              ) : null}

              {pack.status === "free" ? (
                <View style={[styles.statusBadge, styles.freeBadge]}>
                  <AppText variant="small" style={styles.freeBadgeText}>
                    무료
                  </AppText>
                </View>
              ) : null}

              {pack.status === "priced" ? (
                <View style={[styles.statusBadge, styles.priceBadge]}>
                  <Image
                    source={require("../../../assets/icons/coin.png")}
                    style={{ width: 20, height: 20 }}
                  />
                  <AppText variant="small" style={styles.priceBadgeText}>
                    {pack.priceLabel}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.actionSection}>
          <AppButton
            label={primaryLabel}
            onPress={handlePrimaryAction}
            leftIcon={
              pack.status === "priced" && pack.ownStatus !== "owned" ? (
                <Image
                  source={require("../../../assets/icons/coin.png")}
                  style={styles.primaryButtonCoin}
                />
              ) : undefined
            }
          />
        </View>

        {pack.kind === "sticker" ? (
          <View style={styles.section}>
            <AppText variant="title" style={styles.sectionTitle}>
              포함된 스티커
            </AppText>

            {pack.previewStickers && pack.previewStickers.length > 0 ? (
              <View style={styles.previewGrid}>
                {pack.previewStickers.map((sticker) => (
                  <StickerPreviewCard
                    key={sticker.id}
                    name={sticker.name}
                    imageSource={sticker.imageSource}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <AppText variant="caption">
                  미리보기 스티커가 아직 준비되지 않았어요.
                </AppText>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <AppText variant="title" style={styles.sectionTitle}>
              포함된 배경
            </AppText>
            // TODO : 배경 미리보기 연결
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

export default PackDetailScreen;

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xxl,
    padding: spacing.md,
  },
  heroImageWrapper: {
    width: "100%",
    aspectRatio: 1.1,
    borderRadius: radius.xl,
    backgroundColor: colors.background.subtle,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    width: "84%",
    height: "84%",
    resizeMode: "contain",
  },
  heroPlaceholder: {
    width: "84%",
    height: "84%",
    borderRadius: radius.lg,
    backgroundColor: colors.background.surface,
  },
  heroTextArea: {
    marginTop: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  packTitle: {
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: colors.state.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.round,
  },
  newBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    lineHeight: 12,
  },
  description: {
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
    gap: 10,
  },
  statusBadge: {
    borderRadius: radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  primaryButtonCoin: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  ownedBadge: {
    backgroundColor: "#E7F1E1",
  },
  ownedBadgeText: {
    color: colors.state.success,
  },
  freeBadge: {
    backgroundColor: "#F6E8C8",
  },
  freeBadgeText: {
    color: colors.state.warning,
  },
  priceBadge: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: colors.background.subtle,
  },
  priceBadgeText: {
    color: colors.text.secondary,
  },
  actionSection: {
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emptyPreview: {
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
