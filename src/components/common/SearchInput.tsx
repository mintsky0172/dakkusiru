import { Pressable, StyleSheet, TextInput, View } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { radius, spacing } from "../../constants/spacing";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchInput = ({
  value,
  onChangeText,
  placeholder = "검색어를 입력하세요",
}: SearchInputProps) => {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={styles.clearButton}
        >
          <Ionicons name="close" size={14} color={colors.text.muted} />
        </Pressable>
      ) : null}

      <Ionicons
        name="search"
        size={18}
        color={colors.text.secondary}
        style={styles.searchIcon}
      />
    </View>
  );
};

export default SearchInput;

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontFamily: "Iseoyun",
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
  },
  searchIcon: {
    marginLeft: spacing.xs,
  },
});
