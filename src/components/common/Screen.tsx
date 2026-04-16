import { SafeAreaView, StyleSheet, Text, View, ViewProps } from "react-native";
import React from "react";
import { colors } from "../../constants/colors";
import { layout } from "../../constants/spacing";

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  safeArea?: boolean;
}

const Screen = ({
  children,
  padded = true,
  safeArea = true,
  style,
  ...props
}: ScreenProps) => {
  const content = (
    <View style={[styles.container, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );

  if (!safeArea) return content;

  return <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>;
};

export default Screen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  padded: {
    paddingHorizontal: layout.screenHorizontalPadding
  }
});
