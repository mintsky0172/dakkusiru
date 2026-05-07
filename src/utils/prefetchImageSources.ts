import { Image } from "expo-image";
import { ImageSourcePropType } from "react-native";

function getUriFromImageSource(source?: ImageSourcePropType | null) {
  if (!source || typeof source === "number") return null;
  if (Array.isArray(source)) {
    return source
      .map((item) => ("uri" in item ? item.uri : null))
      .find((uri): uri is string => !!uri);
  }

  return "uri" in source ? source.uri : null;
}

type PrefetchCachePolicy = "disk" | "memory" | "memory-disk";

export function prefetchImageSources(
  sources: (ImageSourcePropType | undefined)[],
  cachePolicy: PrefetchCachePolicy = "memory-disk",
) {
  const urls = [
    ...new Set(
      sources
        .map((source) => getUriFromImageSource(source))
        .filter((uri): uri is string => !!uri),
    ),
  ];

  if (!urls.length) return undefined;

  return Image.prefetch(urls, cachePolicy);
}
