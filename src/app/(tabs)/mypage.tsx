import { Alert, StyleSheet, ScrollView, View } from "react-native";
import React from "react";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import ProfileCard from "../../components/mypage/ProfileCard";
import MenuRow from "../../components/mypage/MenuRow";
import { spacing } from "../../constants/spacing";

const isGuest = true;

const MyPageScreen = () => {
  const handleLogin = () => {
    Alert.alert("로그인/계정 연결");
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

  const handleLogout = () => {
    Alert.alert("로그아웃");
  };

  const handleDeleteAccount = () => {
    Alert.alert("회원 탈퇴");
  };

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
          description={
            isGuest
              ? "로그인하고 데이터를 클라우드에\n안전하게 저장해 보세요!"
              : ""
          }
          imageSource={require("../../../assets/images/default_profile.png")}
          actionLabel={isGuest ? "로그인" : undefined}
          onPressAction={isGuest ? handleLogin : undefined}
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
              rightText={isGuest ? "로그인 필요" : undefined}
            />
            <MenuRow
              label="데이터 관리"
              imageSource={require("../../../assets/icons/save.png")}
              onPress={handleDataManage}
            />
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
  }
});
