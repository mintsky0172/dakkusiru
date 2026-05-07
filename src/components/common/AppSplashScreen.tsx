import React from "react";
import { Image, ImageBackground, StyleSheet, View } from "react-native";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface AppSplashScreenProps {
  progress: number;
}

const AppSplashScreen = ({ progress }: AppSplashScreenProps) => {
  const normalizedProgress = Math.max(0, Math.min(1, progress));

  return (
    <ImageBackground
      source={require("../../../assets/images/loading_background.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(normalizedProgress * 100)}%` },
            ]}
          />
        </View>
      </View>
    </ImageBackground>
  );
};

export default AppSplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.base,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 180,
    height: 180,
  },
  progressTrack: {
    width: "64%",
    height: 10,
    marginTop: spacing.xl,
    borderRadius: radius.round,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.round,
    backgroundColor: colors.accent.main, 
  },
});
