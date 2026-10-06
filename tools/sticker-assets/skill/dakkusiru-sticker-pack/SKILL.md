---
name: dakkusiru-sticker-pack
description: 다꾸시루 스티커팩을 생성해 등록 준비하거나 기존 inbox 폴더의 개별 스티커를 지정 메타데이터로 R2와 DB에 등록한다.
---

# 다꾸시루 스티커팩

프로젝트의 `tools/sticker-assets/README.md`와 `manifest.json`을 먼저 읽고 기존 도구를 사용한다.
현재 디렉터리에 프로젝트가 없으면 `/Users/sominlee/Desktop/dev/dakkusiru/dakkusiru`를 확인한다.
카테고리는 `src/constants/packCategories.ts`의 `stickerCategoryOptions`와 한글 라벨 맵을 따른다.

신규 팩만 처리하며 기존 팩 수정·덮어쓰기는 지원하지 않는다. 이 스킬 호출만으로 R2/DB 쓰기를
허용한 것으로 해석하지 않는다. 기존 폴더의 실제 등록 요청은 온라인 dry-run 성공 후 실행한다.
이미지 생성 요청은 생성 결과와 검증 결과를 보여주고 사용자가 그 팩의 등록을 요청할 때 실행한다.
기존 승인 범위 내 등록에는 확인을 반복하지 않는다.

등록과 archive 해시 확인을 마친 팩의 inbox 폴더는 삭제한다. `.DS_Store`만 남으면 정리하고 빈 폴더를 제거한다. 보관되지 않은 파일이나 하위 폴더가 남으면 원본을 archive에 보존하기 전까지 폴더를 삭제하지 않는다. 실패·중복 건너뜀·dry-run에서는 inbox 폴더를 삭제하지 않는다.

## 기존 inbox 팩

입력 예시:

```text
$dakkusiru-sticker-pack 기존 inbox 팩 등록
카테고리: 자연/동식물
팩 가격: 1000코인
팩 이름: 고양이 낙서 스티커팩
태그: 귀염, 고양이, 낙서
설명: 귀여운 고양이 낙서 스티커가 들어 있어요.
```

폴더명은 선택 사항이다. 사용자는 카테고리·팩 가격·팩 이름·태그·설명만 입력하면 된다.
폴더 생략 시 `tools/sticker-assets/inbox/`에서 `thumbnail.png`와 개별 PNG/JPG/JPEG가 있는
미등록 폴더를 확인한다. `.state`의 완료 기록과 manifest를 참고해 완료 팩을 신규로 취급하지 않는다.
후보가 하나면 선택하고 여러 개면 대상 폴더만 물어본다. 폴더 이름은 팩 ID이므로 ID 규칙이나
기존 ID/제목과 충돌하면 파일명·기존 팩을 임의 변경하지 말고 원인을 보고한다.

한글 카테고리를 실제 앱 값으로 대응시킨다. 무료/0코인은 `status: free`, 양의 정수 가격은
`status: priced`, `coin_price`로 설정한다. 입력 태그와 설명은 그대로 저장하고 subcategory는
내용에 맞는 영문 슬러그로 정한다. 필수 메타데이터가 빠졌으면 요청한다.

`.cache`에 다음 config를 저장하고 로컬 준비 도구를 실행한다. `folder`를 생략하면 도구가
미등록 후보 하나를 자동 선택한다. 여러 후보가 있거나 사용자가 폴더를 지정한 경우에만 `folder`를 넣는다.

```json
{
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
```

이 도구는 파일명 자연순으로 개별 스티커 목록을 만들고 `thumbnail.png`는 아이템에서 제외한다.
입력 태그만 저장하며 원본/R2 이름 부분을 유지한다. 같은 팩 폴더의 편집 원본(`thumbnail.clip`,
다른 `.clip`, PSD 등)을 모두 함께 archive한다. 도구는 알려진 편집 확장자를 자동 수집한다.
그 밖의 확장자도 팩 제작 원본으로 확인되면 `pack.archive_files`에 추가한다. 숨김 파일과 다른 팩의 파일은 제외한다.
원본 크기·비율·투명도를 유지하고 JPG에 투명도가 있다고 설명하지 않는다.
스티커 시트를 개별 스티커 여러 개로 취급하지 않으며 임의 자동 분할·배경 제거는 하지 않는다.

기존 manifest에 요청과 같은 항목이 있으면 재사용해 상태를 확인한다. 다른 항목이 있거나
완료 팩의 메타데이터 변경이 요청되면 이 신규 등록 도구로 수정하지 않는다.
전역 manifest의 다른 항목을 지우거나 변경하지 않는다.

## 생성 스티커 준비

`imagegen` 스킬을 읽고 내장 이미지 생성 도구를 사용한다. 테마·개수·스타일·카테고리·가격은
사용자 요청을 따른다. 개수가 없으면 미리보기용 3개, 가격이 없으면 무료로 준비한다고 알린다.
각 스티커를 별도 이미지로 생성하고 `transparent_background: true`로 투명 배경을 요청한다.
사용자가 종이/불투명 배경을 원하는 경우 그 요청을 따른다. 개별 대상이 온전히 보이고 가장자리에서
잘리지 않도록 여백을 둔다. 별도 요구가 없으면 글자·로고·워터마크를 넣지 않는다.
생성 도구가 특정 픽셀 크기를 보장한다고 설명하지 않는다.

결과를 확인하고 아래 config와 생성 프롬프트를 `.cache`에 저장한다. source는 도구가 실제
반환한 경로를 사용한다. 요청한 개수 전체를 images에 지정한다.

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
  "images": [{ "source": "/absolute/path/from/imagegen.png", "name": "누운 고양이" }]
}
```

```sh
node tools/sticker-assets/prepare-generated.mjs tools/sticker-assets/.cache/pack-config.json
```

보조 도구는 크롭·리사이즈 없이 inbox의 `1.png`, `2.png`, …와 미리보기·manifest를 준비한다.
실패한 부분 생성 파일과 도구가 반환한 원본은 보존한다. lock이 남으면 해당 프로세스가 종료됐는지
확인하고 부분 생성 폴더를 조사한 후 복구한다. 도구 실패 시 API 키를 요구하거나 다른 생성 API로
임의 전환하지 않는다.

## 팩별 검증과 등록

```sh
npm run assets:register-stickers:dry -- --pack PACK_ID
```

실제 팩 ID로 바꾸고 해당 팩만 처리한다. 온라인 검증은 기존 스티커 전체를 비교하며 스티커의
미완료 journal이 있으면 실제 실행의 복구 절차를 따른다. 오프라인 미검증·중복 건너뜀·실패를
성공으로 보고하지 않는다. 동일 오류 반복 또는 복구 실패 시 원인을 보고하고 임의 DB/R2 정리는
하지 않는다. `.state`를 삭제해 복구를 우회하지 않는다.

준비만 요청한 경우 여기서 종료한다. 생성 요청은 미리보기를 절대 경로 이미지로 표시하고
팩 ID·개수·카테고리·세부 카테고리·가격·원본 위치·manifest·검증 결과와 프롬프트 링크를 제공한다.
생성 결과를 확인한 사용자의 등록 요청을 기다린다.

실제 등록 요청이 있고 온라인 dry-run이 성공하면 실행한다.

```sh
npm run assets:register-stickers -- --pack PACK_ID
```

기존 journal의 실패 보상/복구를 사용한다. 완료 후 해당 팩의 R2/DB 확인 결과, 가격·개수·태그와
archive 파일 목록을 확인해 안내한다. 다른 팩을 함께 등록하는 전역 실행은 하지 않는다.
