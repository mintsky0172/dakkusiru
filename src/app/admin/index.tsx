import { Pressable, StyleSheet, View } from "react-native";
import React from "react";
import { useAuthStore } from "../../store/authStore";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
import { router } from "expo-router";
import { radius, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

const AdminHomeScreen = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoaded = useAuthStore((state) => state.isLoaded);

  const isAdmin = profile?.role === "admin";

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
        <View style={styles.center}>
          <AppText variant="h2">로그인이 필요해요</AppText>
          <AppText variant="caption" style={styles.description}>
            관리자 기능을 사용하려면 로그인해주세요.
          </AppText>

          <View style={styles.buttonWrapper}>
            <AppButton
              label="로그인하기"
              onPress={() => router.push("/login")}
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="h2">관리자 권한이 없어요</AppText>
          <AppText variant="caption" style={styles.description}>
            관리자만 접근할 수 있는 페이지에요.
          </AppText>
        </View>
      </Screen>
    );
  }
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/mypage")}
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
          <AppText variant="h1">관리자</AppText>
        </View>
      </View>

      <View style={styles.menuList}>
        <AdminMenuCard
          title="팩 관리"
          description="등록된 스티커팩/배경팩을 확인하고 수정해요."
          buttonLabel="팩 목록 보기"
          onPress={() => router.push("/admin/packs")}
        />
        <AdminMenuCard
          title="새 팩 등록"
          description="새 스티커팩/배경팩을 만들고 아이템을 추가해요."
          buttonLabel="팩 등록하기"
          onPress={() => router.push("/admin/pack-form")}
        />
      </View>
    </Screen>
  );
};

export default AdminHomeScreen;

interface AdminMenuCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
}

function AdminMenuCard({
  title,
  description,
  buttonLabel,
  onPress,
}: AdminMenuCardProps) {
  return (
    <View style={styles.menuCard}>
      <AppText variant="title">{title}</AppText>
      <AppText variant="caption" style={styles.cardDescription}>
        {description}
      </AppText>

      <View style={styles.buttonWrapper}>
        <AppButton variant="secondary" label={buttonLabel} onPress={onPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.xl,
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
  menuList: {
    gap: spacing.md,
  },
  menuCard: {
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.card.background,
    borderWidth: 1,
    borderColor: colors.card.border,
  },
  cardDescription: {
    marginTop: spacing.xs,
  },
  buttonWrapper: {
    marginTop: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
});
