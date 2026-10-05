# 스티커 에셋 자동 등록

배경 등록 파이프라인의 중복 검사·R2/DB 등록·durable journal·실패 보상·archive 복구를
재사용합니다. DB 스키마와 앱 코드는 변경하지 않습니다. 신규 스티커 팩 단위로 등록하며
기존 팩 수정·덮어쓰기·자동 삭제는 지원하지 않습니다.

## 기존 폴더에서 준비

`tools/sticker-assets/inbox/{packId}/`에 스티커 PNG/JPG/JPEG와 `thumbnail.png`를 넣습니다.
이미지는 개별 스티커여야 합니다. 스티커 시트를 자동 분리하거나 배경을 제거하지 않습니다.
원본 크기·비율·투명도를 유지합니다. 투명한 스티커는 PNG를 사용하세요.

다음 JSON을 `tools/sticker-assets/.cache/pack-config.json`에 저장합니다.
`folder`는 inbox 바로 아래 폴더 이름이며 팩 ID로 사용합니다.

```json
{
  "folder": "cat-doodle-pack",
  "pack": {
    "title": "고양이 낙서 스티커팩",
    "category": "nature",
    "subcategory": "cat",
    "status": "priced",
    "coin_price": 1000,
    "tags": ["귀염", "고양이", "낙서"],
    "description": "귀여운 고양이 낙서 스티커가 들어 있어요."
  }
}
```

```sh
node tools/sticker-assets/prepare-inbox.mjs tools/sticker-assets/.cache/pack-config.json
npm run assets:register-stickers:dry -- --pack cat-doodle-pack
npm run assets:register-stickers -- --pack cat-doodle-pack
```

준비 도구는 파일명 자연순으로 아이템을 만들고, 아이템 이름은 확장자를 뺀 파일명으로 저장합니다.
`thumbnail.png`와 숨김 파일은 아이템에서 제외합니다. `thumbnail.clip`은 있으면 성공 후 함께
archive할 목록에 추가합니다. 다른 편집 파일은 `pack.archive_files`로 명시한 경우만 보관합니다.
하위 폴더·심볼릭 링크 파일은 자동 수집하지 않습니다.
기본적으로 입력 태그만 저장하고 R2 파일명도 원본 이름 부분을 유지합니다.
manifest에 새 팩만 추가하며 기존 폴더·팩 ID·제목 충돌은 오류로 종료합니다.
원본은 준비 단계에서 이동하거나 변경하지 않습니다.

## 직접 manifest 작성

`manifest.example.json`을 참고해 `manifest.json`을 편집할 수도 있습니다.
등록은 manifest에 명시된 이미지·썸네일·archive 파일만 처리합니다.
필드와 실패/복구 절차는 [배경 파이프라인 README](../background-assets/README.md)를 참고하되,
스티커는 다음 규칙을 사용합니다.

- 카테고리: 앱의 `stickerCategoryOptions`를 직접 읽습니다.
  `food`, `character`, `deco`, `memo`, `lettering`, `label`, `masking_tape`, `object`, `nature`, `etc`.
- 크기: 고정 크기나 비율 제한 없이 PNG/JPEG 단일 이미지를 받습니다. `allow_nonstandard_height`는 필요 없습니다.
- 원본: 원본 크기·투명도를 유지하는 무손실 WebP. EXIF 회전은 적용합니다.
- 미리보기: 최대 256×256, 썸네일: 최대 512×512 WebP(품질 82). 확대·크롭 없이 비율을 유지합니다.
- DB: `shop_packs.kind = "sticker"`, 기존 `shop_pack_items` 필드를 사용합니다.
- R2: `packs/stickers/{packId}/items/`, `previews/`, `thumbnail*.webp`.
- 로컬: `tools/sticker-assets/inbox/`, `archive/{category}/{subcategory}/{packId}/`, `.state/`, `.cache/`.
- 중복: 기존 **스티커** 원본의 픽셀 해시와 비교합니다. 배경 팩과 캐시·상태를 분리합니다.
  동일 이미지가 있으면 팩 전체를 건너뛰고 원본을 보존합니다. 기존 팩 ID/제목 충돌은 종류와 관계없이 거부합니다.

`preserve_file_names: false`(직접 manifest의 기본값)이면 원본 이름을 정규화하고 실행 UUID를 붙입니다.
`true`이면 파일명에서 확장자만 `.webp`로 바꿉니다. 원본/archive 파일명은 언제나 보존됩니다.
`include_subcategory_tag: false`이면 입력 태그만 저장합니다. 기본 true이면 subcategory도 태그에 추가합니다.
직접 manifest에서 thumbnail을 생략하면 첫 아이템으로 생성합니다.

## 환경변수와 실행

프로젝트 루트 `.env`의 배경 등록용 설정을 그대로 사용합니다.
`SUPABASE_URL`(또는 `EXPO_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`,
`R2_ACCOUNT_ID`(또는 `R2_ENDPOINT`), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`이 필요합니다.
앱에서 이미지를 표시하려면 `EXPO_PUBLIC_ASSET_BASE_URL`에 R2 공개 도메인을 설정합니다.
선택 설정은 `SUPABASE_STORAGE_BUCKET`(기본 `dakku-assets`), `R2_CACHE_CONTROL`,
`STICKER_ASSET_REQUEST_TIMEOUT_MS`(기본 30000, 1~600000ms)입니다.
서비스 역할 키와 R2 비밀키는 `EXPO_PUBLIC_` 변수에 넣지 않습니다.

```sh
npm run assets:register-stickers:dry -- --pack PACK_ID
npm run assets:register-stickers -- --pack PACK_ID
npm run assets:register-stickers:dry -- --pack PACK_ID --refresh-hash-cache
npm run assets:test-stickers
```

`--pack`을 생략하면 전체 manifest가 대상입니다. `--help`로 옵션을 확인할 수 있습니다.
온라인 dry-run은 원격 데이터 읽기와 로컬 해시 캐시 저장만 합니다.
비공개 환경변수가 부족하면 오프라인 dry-run으로 표시하고 원격 중복·접근 권한은 미검증입니다.
실제 등록은 업로드 → 비활성 팩/아이템 INSERT → 검증 → 활성화 → archive 순서입니다.
실패 시 이번 실행 소유 데이터만 보상 삭제하고, 원본은 유지합니다. committed 이후 archive 실패는
등록을 롤백하지 않으며 다음 실제 실행에서 이동을 재개합니다.
`.state`와 archive를 함께 보관하고, 복구 오류가 있으면 기존 기록을 수동 삭제하지 마세요.
다른 컴퓨터·관리자·배경 등록을 포함해 등록 작업을 동시에 실행하지 마세요.
이 도구는 DB ID/제목 검사와 INSERT 제약을 사용하지만 별도 실행 간 전역 트랜잭션은 제공하지 않습니다.

## 생성 이미지 준비와 Codex 스킬

스킬 원본: [dakkusiru-sticker-pack](skill/dakkusiru-sticker-pack/SKILL.md).
기존 폴더 등록 또는 내장 이미지 생성으로 개별 스티커를 만든 뒤 로컬 준비·팩별 검증을 진행합니다.
생성 결과는 확인 후 등록하며, 이미 존재하는 폴더의 실제 등록 요청은 온라인 dry-run 이후 실행합니다.

생성 이미지 config 예시(원본 크기 유지):

```json
{
  "resize": "none",
  "pack": {
    "id": "cat-doodle-pack",
    "title": "고양이 낙서 스티커팩",
    "category": "nature",
    "subcategory": "cat",
    "status": "free",
    "tags": ["고양이", "낙서"],
    "include_subcategory_tag": false
  },
  "images": [{ "source": "/absolute/path/to/generated-cat.png", "name": "누운 고양이" }]
}
```

```sh
node tools/sticker-assets/prepare-generated.mjs tools/sticker-assets/.cache/pack-config.json
npm run assets:register-stickers:dry -- --pack cat-doodle-pack
```

생성 준비는 inbox에 `1.png`, `2.png`, …를 만들고 미리보기와 manifest를 준비합니다.
원본 파일을 삭제하지 않으며 크롭·리사이즈·스티커 시트 분할·배경 제거를 하지 않습니다.
실패한 부분 생성 파일은 보존합니다. `manifest.lock`이 남으면 해당 준비 프로세스가
종료됐는지 확인하고 부분 생성 폴더를 조사한 뒤 복구하세요.
