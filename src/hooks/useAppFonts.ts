import { useFonts } from 'expo-font';

export function useAppFonts() {
  const [fontsLoaded] = useFonts({
    Iseoyun: require('../../assets/fonts/Iseoyun.ttf'),
  });

  return fontsLoaded;
}