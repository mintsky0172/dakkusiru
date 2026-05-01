import { Alert, StyleSheet, TextInput, View } from "react-native";
import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { router } from "expo-router";
import Screen from "../components/common/Screen";
import { AppText } from "../components/common/AppText";
import { colors } from "../constants/colors";
import AppButton from "../components/common/AppButton";
import { radius, spacing } from "../constants/spacing";

const LoginScreen = () => {
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await login(email.trim(), password);
      router.back();
    } catch (error) {
      Alert.alert(
        "로그인 실패",
        error instanceof Error ? error.message : "로그인 중 오류가 발생했어요.",
      );
    }
  };

  const handleSignup = async () => {
    try {
      await signup(email.trim(), password);
      Alert.alert("가입 완료", "이제 관리자 권한을 확인할 수 있어요.");
      router.back();
    } catch (error) {
      Alert.alert(
        "가입 실패",
        error instanceof Error ? error.message : "가입 중 오류가 발생했어요.",
      );
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="h1">로그인</AppText>
        <AppText variant="caption" style={styles.description}>
          관리자 팩 등록을 위해 로그인해주세요.
        </AppText>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="이메일"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.text.muted}
          style={styles.input}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
          placeholderTextColor={colors.text.muted}
          style={styles.input}
        />

        <View style={styles.buttonGroup}>
          <AppButton
            label={isLoading ? "로그인 중..." : "로그인"}
            onPress={handleLogin}
            disabled={isLoading}
          />
          <AppButton
            label="회원가입"
            variant="secondary"
            onPress={handleSignup}
            disabled={isLoading}
          />
        </View>
      </View>
    </Screen>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
  },
  description: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.sm,
  },
  buttonGroup: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
