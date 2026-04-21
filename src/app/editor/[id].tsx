import { useLocalSearchParams } from "expo-router";
import EditorScreen from "../../screens/EditorScreen";

export default function EditDakkuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <EditorScreen mode="edit" dakkuId={id} />;
}
