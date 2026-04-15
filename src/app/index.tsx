import { View, Text, Pressable } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { supabase } from "../services/supabase/client";

const HomeScreen = () => {

  const test = async () => {
    const {data, error} = await supabase
        .from('sticker_packs')
        .select('*');

    console.log('data: ', data);
    console.log('error: ', error);
  }

  test();

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 24 }}>
        다꾸시루
      </Text>

      <Link href="/editor" asChild>
        <Pressable
          style={{ padding: 16, backgroundColor: "#f3e7da", borderRadius: 12 }}
        >
          <Text>새 다꾸 만들기</Text>
        </Pressable>
      </Link>

      <View style={{ height: 12 }} />

      <Link href="/saved" asChild>
        <Pressable
          style={{ padding: 16, backgroundColor: "#eee", borderRadius: 12 }}
        >
          <Text>저장된 다꾸 보기</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
};

export default HomeScreen;
