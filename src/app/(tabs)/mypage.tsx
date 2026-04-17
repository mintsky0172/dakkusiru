import { Alert, StyleSheet, ScrollView, View } from "react-native";
import React, { useMemo, useState } from "react";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import ProfileCard from "../../components/mypage/ProfileCard";
import MenuRow from "../../components/mypage/MenuRow";
import { spacing } from "../../constants/spacing";
import { guestUser, signedInUser } from "../../mocks/user";
import { UserProfile } from "../../types/user";

const isGuest = true;

const MyPageScreen = () => {
  // 테스트용 토글
  const [user, setUser] = useState<UserProfile>(signedInUser);

  const isGuest = user.status === "guest";

  const handleLogin = () => {
    Alert.alert("로그인/계정 연결");
    setUser(signedInUser);
  };

  const handleLogout = () => {
    Alert.alert("로그아웃");
    setUser(guestUser);
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

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <AppText variant="h1">마이페이지</AppText>
        </View>

        <ProfileCard
          name={isGuest ? "게스트" : "닉네임입니다"}
          description={profileDescription}
          subDescription={!isGuest ? user.email : undefined}
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
