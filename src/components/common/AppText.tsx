import React from "react";
import { StyleProp, Text, TextProps, TextStyle } from "react-native";
import { typography } from "../../constants/typography";

type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "body"
  | "bodyStrong"
  | "caption"
  | "small"
  | "button"
  | "chip"
  | "tabLabel";

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AppText({
  variant = "body",
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text style={[typography[variant], style]} {...props}>
      {children}
    </Text>
  );
}
