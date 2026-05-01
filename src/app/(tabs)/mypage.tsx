import { Alert, StyleSheet, ScrollView, View, Image, Pressable } from "react-native";
import React, { useMemo } from "react";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import ProfileCard from "../../components/mypage/ProfileCard";
import MenuRow from "../../components/mypage/MenuRow";
import { spacing } from "../../constants/spacing";
import { router } from "expo-router";
import { useAuthStore } from "../../store/authStore";

const MyPageScreen = () => {
  const authUser = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);

  const isGuest = !authUser;
  const isAdmin = !!authUser && profile?.role === "admin";

  const handleLogin = () => {
    router.push("/login");
  };

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert("로그아웃", "로그아웃되었어요.");
    } catch (error) {
      Alert.alert(
        "로그아웃 실패",
        error instanceof Error
          ? error.message
          : "로그아웃 중 오류가 발생했어요.",
      );
    }
  };

  const handleCloudSync = () => {
    Alert.alert("클라우드 동기화");
  };

  const handleDataManage = () => {
    Alert.alert("데이터 관리");
  };

  const handleSuggestSticker = () => {
    Alert.alert("스티커 제안하기");
  };

  const handleContact = () => {
    Alert.alert("문의하기");
  };

  const handleAccountInfo = () => {
    Alert.alert("계정 정보");
  };

  const handlePurchasedPacks = () => {
    Alert.alert("내 스티커팩");
  };

  const handleDeleteAccount = () => {
    Alert.alert("회원 탈퇴");
  };

  const profileDescription = useMemo(() => {
    if (isGuest) {
      return "로그인하고 데이터를 클라우드에\n안전하게 저장해보세요!";
    }
    return "";
  }, [isGuest]);
  const profileName = isGuest ? "게스트" : isAdmin ? "관리자" : "닉네임입니다";

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <AppText variant="h1">마이페이지</AppText>

          {isAdmin ? (
            <Pressable
              style={styles.admin}
              onPress={() => router.push("/admin")}
            >
              <Image
                source={require("../../../assets/icons/tool.png")}
                style={styles.adminIcon}
              />
              <AppText variant="body">관리자 페이지</AppText>
            </Pressable>
          ) : null}
        </View>

        <ProfileCard
          name={profileName}
          description={profileDescription}
          subDescription={!isGuest ? authUser.email : undefined}
          imageSource={require("../../../assets/images/default_profile.png")}
          actionLabel={isGuest ? "로그인" : "계정 정보 보기"}
          onPressAction={isGuest ? handleLogin : handleAccountInfo}
          onPressSecondaryAction={!isGuest ? handleLogout : undefined}
        />

        <View style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>
            데이터
          </AppText>

          <View style={styles.menuGroup}>
            <MenuRow
              label="클라우드 동기화"
              imageSource={require("../../../assets/icons/cloud.png")}
              onPress={handleCloudSync}
              rightText={isGuest ? "로그인 필요" : ""}
            />
            <MenuRow
              label="데이터 관리"
              imageSource={require("../../../assets/icons/save.png")}
              onPress={handleDataManage}
            />
            {!isGuest ? (
              <MenuRow
                label="내 스티커팩"
                imageSource={require("../../../assets/icons/heart_pink.png")}
                onPress={handlePurchasedPacks}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>
            제안 / 문의
          </AppText>

          <View style={styles.menuGroup}>
            <MenuRow
              label="새로운 스티커 제안하기"
              imageSource={require("../../../assets/icons/idea.png")}
              onPress={handleSuggestSticker}
            />
            <MenuRow
              label="문의하기"
              imageSource={require("../../../assets/icons/mail.png")}
              onPress={handleContact}
            />
          </View>

          <View style={styles.section}>
            <AppText variant="title" style={styles.sectionTitle}>
              계정
            </AppText>

            <View style={styles.menuGroup}>
              {!isGuest ? (
                <MenuRow
                  label="로그아웃"
                  imageSource={require("../../../assets/icons/logout.png")}
                  onPress={handleLogout}
                />
              ) : null}
              <MenuRow
                label="회원 탈퇴"
                imageSource={require("../../../assets/icons/exit.png")}
                onPress={handleDeleteAccount}
                danger
                rightText={isGuest ? "로그인 후 가능" : undefined}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

export default MyPageScreen;

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems:'center',
    justifyContent: 'space-between'
  },
  admin: {
    flexDirection: "row",
  },
  adminIcon: {
    width: 24,
    height: 24,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  menuGroup: {
    gap: spacing.xs,
  },
});
