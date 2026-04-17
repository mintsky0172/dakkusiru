import { Alert, StyleSheet, Text, View, FlatList } from "react-native";
import React from "react";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
import DakkuCard from "../../components/dakku/DakkuCard";
import IconButton from "../../components/common/IconButton";
import { layout, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { router } from "expo-router";

type DakkuItem = {
  id: string;
  title: string;
  dateLabel: string;
  thumbnailSource: any;
};

type CreateCardItem = {
  id: "create-card";
  isCreateCard: true;
};

type HomeListItem = DakkuItem | CreateCardItem;

// 테스트용 : 빈 상태 보려면 []로 바꾸기
const mockDakkus: DakkuItem[] = [
  {
    id: "1",
    title: "다꾸1",
    dateLabel: "26.04.15 18:00",
    thumbnailSource: require("../../../assets/images/dakku_default.png"),
  },
  {
    id: "2",
    title: "다꾸2",
    dateLabel: "26.04.15 18:00",
    thumbnailSource: require("../../../assets/images/dakku_default.png"),
  },
  {
    id: "3",
    title: "다꾸3",
    dateLabel: "26.04.15 18:00",
    thumbnailSource: require("../../../assets/images/dakku_default.png"),
  },
];

const HomeScreen = () => {
  const handlePressDakku = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handlePressMenu = (id: string) => {
    Alert.alert("메뉴 열기:", id);
  };

  const handleCreateDakku = () => {
    router.push("/new");
  };

  if (mockDakkus.length === 0) {
    return (
      <Screen style={styles.screen}>
        <View style={styles.header}>
          <AppText variant="h1">내 다꾸</AppText>
        </View>

        <View style={styles.emptyContainer}>
          <AppText variant="h3" style={styles.emptyTitle}>
            아직 만든 다꾸가 없어요.
          </AppText>
          <AppText variant="caption" style={styles.emptyDescription}>
            첫 다꾸를 만들고{"\n"}디지털 다꾸 생활을 시작해 보세요!
          </AppText>

          <View style={styles.emptyButtonWrapper}>
            <AppButton label="첫 다꾸 만들기" onPress={handleCreateDakku} />
          </View>
        </View>
      </Screen>
    );
  }

  const dataWithCreateCard: HomeListItem[] = [
    ...mockDakkus,
    { id: "create-card", isCreateCard: true },
  ];

  const renderItem = ({
    item,
    index,
  }: {
    item: HomeListItem;
    index: number;
  }) => {
    if ("isCreateCard" in item) {
      return (
        <View
          style={[
            styles.cardWrapper,
            index % 2 === 0 ? styles.leftCard : styles.rightCard,
          ]}
        >
          <DakkuCard
            isCreateCard
            createLabel="새 다꾸"
            createIconSource={require("../../../assets/icons/plus.png")}
            onPress={handleCreateDakku}
          />
        </View>
      );
    }
    return (
      <View
        style={[
          styles.cardWrapper,
          index % 2 === 0 ? styles.leftCard : styles.rightCard,
        ]}
      >
        <DakkuCard
          title={item.title}
          dateLabel={item.dateLabel}
          thumbnailSource={item.thumbnailSource}
          onPress={() => handlePressDakku(item.id)}
          onMenuPress={() => handlePressMenu(item.id)}
        />
      </View>
    );
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="h1">내 다꾸</AppText>
      </View>

      <FlatList<HomeListItem>
        data={dataWithCreateCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <IconButton
        imageSource={require("../../../assets/icons/plus.png")}
        onPress={handleCreateDakku}
        variant="filled"
        size={56}
        iconSize={24}
        style={styles.fab}
      />
    </Screen>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  screen: {
    paddingBottom: layout.bottomTabHeight + spacing.xl,
  },
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  cardWrapper: {
    width: "50%",
    marginBottom: spacing.md,
  },
  leftCard: {
    paddingRight: spacing.xs,
  },
  rightCard: {
    paddingLeft: spacing.xs,
  },
  fab: {
    position: "absolute",
    right: layout.screenHorizontalPadding,
    bottom: spacing.md,
    backgroundColor: colors.accent.soft,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: layout.bottomTabHeight,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyDescription: {
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 220,
  },
  emptyButtonWrapper: {
    width: "100%",
    marginTop: spacing.xl,
  },
});
