import { Alert, StyleSheet, View, FlatList } from "react-native";
import React, { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import Screen from "../../components/common/Screen";
import { AppText } from "../../components/common/AppText";
import AppButton from "../../components/common/AppButton";
import DakkuCard from "../../components/dakku/DakkuCard";
import IconButton from "../../components/common/IconButton";
import { layout, spacing } from "../../constants/spacing";
import { colors } from "../../constants/colors";
import { router } from "expo-router";
import { SavedDakku } from "../../types/savedDakku";
import {
  deleteDakkuFromLocal,
  loadSavedDakkusFromLocal,
  renameDakkuFromLocal,
} from "../../services/localDakkuStorage";
import DakkuActionModal from "../../components/dakku/DakkuActionModal";
import RenameDakkuModal from "../../components/dakku/RenameDakkuModal";

type CreateCardItem = {
  id: "create-card";
  isCreateCard: true;
};

type HomeListItem = SavedDakku | CreateCardItem;

const HomeScreen = () => {
  const [savedDakkus, setSavedDakkus] = useState<SavedDakku[]>([]);
  const [selectedDakku, setSelectedDakku] = useState<SavedDakku | null>(null);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

  const loadDakkus = useCallback(async () => {
    const data = await loadSavedDakkusFromLocal();
    setSavedDakkus(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDakkus();
    }, [loadDakkus]),
  );

  const handlePressDakku = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handlePressMenu = (dakku: SavedDakku) => {
    setSelectedDakku(dakku);
    setIsActionModalVisible(true);
  };

  const handleCloseActionModal = () => {
    setIsActionModalVisible(false);
  };

  const handleOpenRenameModal = () => {
    setIsActionModalVisible(false);
    setIsRenameModalVisible(true);
  };

  const handleCreateDakku = () => {
    router.push("/new");
  };

  const handleRenameDakku = async (title: string) => {
    if (!selectedDakku) return;

    await renameDakkuFromLocal(selectedDakku.id, title);
    setIsRenameModalVisible(false);
    setSelectedDakku(null);
    await loadDakkus();
  };

  const handleDeleteDakku = () => {
    if (!selectedDakku) return;

    setIsActionModalVisible(false);

    Alert.alert(
      "다꾸 삭제",
      "삭제한 다꾸는 되돌릴 수 없어요. 정말 삭제할까요?",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await deleteDakkuFromLocal(selectedDakku.id);
            setSelectedDakku(null);
            await loadDakkus();
          },
        },
      ],
    );
  };

  if (savedDakkus.length === 0) {
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
    ...savedDakkus,
    { id: "create-card", isCreateCard: true as const },
  ];

  const renderItem = ({
    item,
    index,
  }: {
    item: SavedDakku | { id: "create-card"; isCreateCard: true };
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
          dateLabel={formatDateLabel(item.updatedAt)}
          thumbnailSource={
            item.thumbnailUri ? { uri: item.thumbnailUri } : undefined
          }
          onPress={() => handlePressDakku(item.id)}
          onMenuPress={() => handlePressMenu(item)}
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

      <DakkuActionModal
        visible={isActionModalVisible}
        title={selectedDakku?.title ?? ""}
        onClose={handleCloseActionModal}
        onRename={handleOpenRenameModal}
        onDelete={handleDeleteDakku}
      />

      <RenameDakkuModal
        visible={isRenameModalVisible}
        initialTitle={selectedDakku?.title ?? ""}
        onClose={() => {
          setIsRenameModalVisible(false);
          setSelectedDakku(null);
        }}
        onConfirm={handleRenameDakku}
      />
    </Screen>
  );
};

function formatDateLabel(value: string) {
  const date = new Date(value);

  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${yy}.${mm}.${dd} ${hh}:${min}`;
}

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
