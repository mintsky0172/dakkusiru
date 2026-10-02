---
name: dakkusiru-background-pack
description: 다꾸시루 배경팩을 내장 이미지 생성으로 만들고 크기 보정, inbox 저장, manifest 추가, 미리보기와 dry-run까지 준비한다. 다꾸시루 배경 에셋 생성·등록 준비 요청에 사용한다.
---

# 다꾸시루 배경팩 만들기

이미지 생성과 등록 준비를 자동화한다. 생성한 이미지와 검증 결과를 먼저 보여주고,
사용자가 결과를 확인하여 실제 업로드를 요청한 뒤 해당 팩만 등록한다.
이 스킬을 설치·호출했다는 이유만으로 R2/DB 쓰기나 기존 팩 변경을 허용한 것으로 해석하지 않는다.

## 프로젝트와 요청

대상은 npm 기반 다꾸시루 저장소다. 현재 작업 디렉터리에서
`tools/background-assets/register.mjs`, `prepare-generated.mjs`, `src/constants/packCategories.ts`를 확인한다.
다른 프로젝트에서 호출하면 `/Users/sominlee/Desktop/dev/dakkusiru/dakkusiru`를 확인하고 해당 저장소에서 작업한다.
경로가 없으면 대상 프로젝트 위치를 물어본다.

실행 전에 `tools/background-assets/README.md`와 현재 `manifest.json`을 읽는다.
사용자가 지정한 테마·개수·색상·레퍼런스·카테고리·가격을 우선한다.
개수가 없으면 작은 미리보기 팩 3장을 기본으로 하고 이를 알린다. 새 팩의 가격이 없으면 무료로 준비한다.
카테고리는 실제 앱 목록에서 테마에 맞춰 정하고, 세부 카테고리는 영문 소문자/숫자/하이픈으로 만든다.
세부 카테고리는 기존 DB `tags`와 archive 분류에 사용되며 새 DB 컬럼을 만들지 않는다.
기존 manifest나 inbox에 없는 팩 ID를 사용하고 ID/제목 충돌 시 새 식별자를 선택한다.
기존 항목·가격·경로를 수정하거나 예시 팩을 임의로 삭제하지 않는다.

## 이미지 생성

사용 가능한 `imagegen` 스킬을 읽고 내장 `image_gen` 도구를 사용한다.
별도 OpenAI API 키를 요구하지 않고, 도구가 실패하면 API/CLI로 임의 전환하지 않는다.
여러 장이면 이미지별 프롬프트로 각각 생성한다. 한 장의 콜라주를 여러 원본으로 취급하지 않는다.
전체 팩의 패턴 크기·팔레트·질감을 유지하면서 각 장의 구체적인 변화를 명시한다.

기본 프롬프트는 세로 다꾸 배경, 화면 전체를 덮는 평면 이미지, 스티커를 올릴 수 있는 여백,
글자/로고/워터마크/기기 프레임 없음이다. 사용자 요청과 충돌하는 기본값은 적용하지 않는다.
패턴이면 반복 간격과 선 두께를 명시하고 촬영된 종이처럼 원근이 생기지 않게 한다.
생성 출력의 로컬 경로를 기록하고 최종 원본을 프로젝트 inbox에 저장한다.
도구가 정확한 2048×2732를 보장한다고 설명하지 않는다.

최종 파일은 2048×2732 PNG여야 한다. 이 워크플로의 크기 보정은 sharp로
비율을 유지한 중앙 크롭/리사이즈를 사용한다는 점을 시작할 때 알린다.
생성 외의 미술적 수정은 내장 이미지 편집 도구를 사용한다.
사용자가 크롭/리사이즈를 금지했거나 프레임 가장자리 보존을 요구하면 보조 도구로 임의 크롭하지 말고
조건을 충족하는 결과를 만들거나 크기 보정 방법을 확인한다.

## 로컬 준비

이미지를 확인한 뒤 아래 형식의 config를 `tools/background-assets/.cache/`에 저장한다.
`.cache`는 Git에서 제외된다. 경로에 비밀값을 넣지 않는다.

```json
{
  "resize": "cover",
  "pack": {
    "id": "lavender-paper-pack",
    "title": "라벤더 종이 배경팩",
    "category": "moody",
    "subcategory": "paper",
    "status": "free",
    "description": "라벤더 색감의 종이 질감 배경",
    "tags": ["라벤더", "종이"]
  },
  "images": [
    { "source": "/absolute/path/to/generated-image.png", "name": "라벤더 종이" }
  ]
}
```

예시는 한 장이지만 `images`에 요청한 개수 전체를 지정한다. source는 도구가 실제 반환한 파일 경로를 사용한다.
다음 명령으로 원본을 보존하면서 inbox와 manifest를 준비한다.

```sh
node tools/background-assets/prepare-generated.mjs tools/background-assets/.cache/pack-config.json
```

보조 도구는 `inbox/{packId}/1.png`, `2.png`, …를 만들고 픽셀 크기·중복·필드를 검증한다.
성공하면 기존 manifest에 새 팩을 추가하고 미리보기 이미지 경로를 반환한다.
기존 폴더와 manifest 항목은 덮어쓰지 않는다. 실패 시 생성 파일을 보존하므로 원인을 조사한 뒤
새 폴더/팩 ID로 다시 준비한다. `manifest.lock`이 남으면 해당 준비 프로세스가 종료됐는지 확인한 뒤 복구한다.

## 검증과 결과 표시

해당 팩만 dry-run한다. 전역 manifest의 다른 팩까지 등록하는 명령을 실행하지 않는다.

```sh
npm run assets:register-backgrounds:dry -- --pack lavender-paper-pack
```

실제 팩 ID로 바꿔 실행한다. 온라인 dry-run은 읽기와 로컬 해시 캐시 저장만 한다.
검사 중 진행 상황을 전하고 실패/중복 건너뜀/오프라인 미검증을 성공으로 보고하지 않는다.
성공 결과를 확인하면 반환된 미리보기 경로를 절대 경로 이미지로 표시하고,
팩 ID·개수·카테고리·세부 카테고리·가격·원본 위치·manifest·dry-run 결과를 간결하게 안내한다.
사용한 생성 프롬프트도 config 옆에 저장해 결과 링크를 제공한다.

이 단계에서 작업을 마치고 사용자의 이미지 확인을 기다린다.
업로드가 필요하다는 이유만으로 사용자 확인 전에 실제 등록을 실행하지 않는다.
이미지를 본 후 사용자가 이 팩의 등록을 명시적으로 요청하면 다음 명령을 실행한다.

```sh
npm run assets:register-backgrounds -- --pack lavender-paper-pack
```

기존 승인 범위 내 작업에는 확인을 반복해서 요구하지 않는다. 등록 실패 시 기존 journal 복구를 따르고
직접 DB/R2를 임의 정리하지 않는다. 대상 팩이 실제 반영되었는지 확인하여 성공·실패와 archive 위치를 보고한다.

## 호출 예

`$dakkusiru-background-pack 파스텔 그리드 배경 6장 만들어줘. category는 simple, subcategory는 grid, 무료로 준비해줘.`

테마와 장수만 지정해도 위 기본값으로 등록 준비까지 진행한다. 이 스킬은 이미지 생성이 필요한
워크플로이지 터미널 단독 무인 생성 API가 아니다.
