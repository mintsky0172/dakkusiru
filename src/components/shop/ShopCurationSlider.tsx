import {
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { AppText } from "../common/AppText";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";
import { packCategoryLabelMap } from "../../constants/packCategories";
import { ShopPack } from "../../types/shop";

interface ShopCurationSliderProps {
  packs: ShopPack[];
  onPressPack: (pack: ShopPack) => void;
}

interface CurationSlideProps {
  pack: ShopPack;
  width: number;
  onPress: () => void;
}

const MAX_CURATION_PACKS = 6;
const SLIDE_HEIGHT = 112;
const THUMBNAIL_SIZE = 88;

const getCurationSubtitle = (pack: ShopPack) => {
  if (pack.tags?.length) return `#${pack.tags.slice(0, 2).join(" #")}`;

  return packCategoryLabelMap[pack.category] ?? pack.category;
};

const CurationSlide = ({ pack, width, onPress }: CurationSlideProps) => {
  const thumbnailSource = pack.thumbnailSource as
    | ImageSourcePropType
    | undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.slide,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.textArea}>
        <View style={styles.badge}>
          <AppText variant="small" style={styles.badgeText}>
            {pack.isNew ? "새로 나온 팩" : "추천 팩"}
          </AppText>
        </View>
        <AppText variant="title" numberOfLines={1} style={styles.title}>
          {pack.title}
        </AppText>
        <AppText variant="caption" numberOfLines={1} style={styles.subtitle}>
          {getCurationSubtitle(pack)}
        </AppText>
      </View>

      <View style={styles.thumbnailFrame}>
        {thumbnailSource ? (
          <ExpoImage
            source={thumbnailSource}
            style={styles.thumbnail}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={80}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}
      </View>
    </Pressable>
  );
};

const ShopCurationSlider = ({
  packs,
  onPressPack,
}: ShopCurationSliderProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const slideWidth = Math.min(screenWidth - spacing.xl * 2, 320);
  const curationPacks = packs.slice(0, MAX_CURATION_PACKS);

  if (!curationPacks.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="title">오늘의 추천</AppText>
        <AppText variant="caption" style={styles.sectionCaption}>
          지금 쓰기 좋은 다꾸팩
        </AppText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={slideWidth + spacing.sm}
        decelerationRate="fast"
        contentContainerStyle={styles.sliderContent}
      >
        {curationPacks.map((pack) => (
          <CurationSlide
            key={pack.id}
            pack={pack}
            width={slideWidth}
            onPress={() => onPressPack(pack)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default ShopCurationSlider;

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionCaption: {
    marginTop: 2,
    color: colors.text.secondary,
  },
  sliderContent: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  slide: {
    height: SLIDE_HEIGHT,
    backgroundColor: "#F8E0D3",
    borderWidth: 1,
    borderColor: "#E7B8A2",
    borderRadius: radius.xl,
    padding: spacing.sm,
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.9,
  },
  textArea: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: spacing.xs,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 250, 241, 0.78)",
    borderRadius: radius.round,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    color: colors.text.primary,
  },
  title: {
    flexShrink: 1,
  },
  subtitle: {
    flexShrink: 0,
    color: colors.text.secondary,
  },
  thumbnailFrame: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    alignSelf: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.background.surface,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    flex: 1,
    backgroundColor: colors.background.subtle,
  },
});
