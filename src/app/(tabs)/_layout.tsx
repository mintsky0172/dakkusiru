import { Image, ImageSourcePropType, StyleSheet } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { colors } from "../../constants/colors";

function TabIcon({
  focused,
  activeSource,
  inactiveSource,
}: {
  focused: boolean;
  activeSource: ImageSourcePropType;
  inactiveSource: ImageSourcePropType;
}) {
  return (
    <Image
      source={focused ? activeSource : inactiveSource}
      style={{
        width: 22,
        height: 22,
        resizeMode: "contain",
      }}
    />
  );
}

const TabsLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tab.active,
        tabBarInactiveTintColor: colors.tab.inactive,
        tabBarStyle: {
          backgroundColor: colors.background.subtle,
          borderTopColor: colors.border.light,
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: "Iseoyun",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeSource={require("../../../assets/icons/shop_active.png")}
              inactiveSource={require("../../../assets/icons/shop_inactive.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeSource={require("../../../assets/icons/home_active.png")}
              inactiveSource={require("../../../assets/icons/home_inactive.png")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "Mypage",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeSource={require("../../../assets/icons/person_active.png")}
              inactiveSource={require("../../../assets/icons/person_inactive.png")}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;

const styles = StyleSheet.create({});
