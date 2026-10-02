# 배경 에셋 자동 등록

기존 npm, Supabase SDK, AWS S3 SDK, sharp를 사용합니다. DB 스키마는 변경하지 않습니다.
신규 배경 **팩 단위**로 등록하며 기존 팩 수정·덮어쓰기·자동 삭제는 지원하지 않습니다.

## 준비

1. `tools/background-assets/inbox/`에 PNG/JPG/JPEG 원본을 넣습니다. 하위 폴더도 가능합니다.
2. `manifest.example.json`을 참고해 `manifest.json`의 `packs`를 작성합니다.
3. 프로젝트 루트 `.env`에 비공개 실행 환경변수를 설정합니다.

```dotenv
# 앱에서 이미 사용하는 EXPO_PUBLIC_SUPABASE_URL로 대체 가능
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
R2_ACCOUNT_ID=
# R2_ACCOUNT_ID 대신 R2_ENDPOINT 사용 가능
# R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
# 앱이 신규 R2 파일을 표시하려면 실제 R2 공개 도메인을 설정
EXPO_PUBLIC_ASSET_BASE_URL=https://your-assets-domain.example
# 선택: 기존 원본이 Supabase Storage에 있을 때 조회하는 버킷
SUPABASE_STORAGE_BUCKET=dakku-assets
# 선택
R2_CACHE_CONTROL=public, max-age=31536000, immutable
# 요청당 제한 시간(ms), 기본 30초; 1~600000
BACKGROUND_ASSET_REQUEST_TIMEOUT_MS=30000
```

서비스 역할 키와 R2 비밀키는 `EXPO_PUBLIC_` 변수에 넣지 않습니다. `.env`, inbox,
archive, `.state`, `.cache`는 Git에서 제외됩니다. manifest에는 비밀값을 넣지 않습니다.
이미 설치된 환경에서는 추가 패키지가 필요 없습니다. 새 체크아웃에서는 `npm ci`를 사용합니다.

## manifest

- `version`: `1`
- `packs`: 등록할 팩 배열. 빈 배열이면 등록하지 않습니다.
- `id`: 영문 소문자·숫자·하이픈 팩 ID. 기존 DB의 ID·제목과 충돌하면 등록하지 않습니다.
- `title`: 필수 제목.
- `category`: 앱의 실제 카테고리 목록(`simple`, `deco`, `moody`, `vintage`, `landscape`, `etc`)을 코드에서 읽어 검증합니다.
- `subcategory`: 영문 소문자·숫자·하이픈으로 지정합니다. DB에 새 필드를 만들지 않고
  기존 `tags` 배열에 이 값을 추가하며 archive 분류에도 사용합니다.
- `status`: `free` 또는 `priced`. 유료는 0 이상의 정수 `coin_price` 필수. 무료 DB 가격은 null.
- `description`, `tags`, `is_active`(기본 true), `sort_order`(기본 0): 선택.
- `items`: 등록할 이미지 목록. `file`은 **inbox 기준 상대 경로**입니다.
  선택 필드 `name`, `background_color`(`#RRGGBB`/`#RRGGBBAA`). 배열 순서가 DB `sort_order`입니다.
- `thumbnail`: 선택한 inbox 원본 상대 경로. 생략하면 첫 아이템에서 생성합니다.

manifest에 명시한 파일만 처리합니다. 폴더의 다른 이미지·PSD·숨김 파일은 자동 등록하지 않습니다.
원본과 지정 썸네일 입력은 실제 PNG/JPEG 단일 이미지여야 하고 EXIF 회전 적용 후
**2048×2731, 2048×2732, 2048×2733** 중 하나여야 합니다. 모든 크기를 비율만으로 허용하지 않습니다.

파일명은 기존 정규화 규칙(공백/언더스코어를 하이픈으로 변환, 소문자화)을 사용합니다.
한글은 NFC 정규화를 추가합니다. 정규화 후 빈 이름·ID 충돌은 오류입니다.

```text
DB 아이템 ID: {packId}-{normalizedFilename}
R2 원본: packs/backgrounds/{packId}/items/{normalizedFilename}-{runUUID}.webp
R2 미리보기: packs/backgrounds/{packId}/previews/{normalizedFilename}-{runUUID}.webp
R2 썸네일: packs/backgrounds/{packId}/thumbnail-{runUUID}.webp
```

원본은 **무손실 WebP**(픽셀 유지), 미리보기는 최대 256×256 WebP 품질 82,
팩 썸네일은 최대 512×512 WebP 품질 82로 생성합니다. 확대하지 않고 비율을 유지합니다.
기존 앱은 DB 경로를 그대로 공개 URL에 연결하므로 `.webp` 경로를 읽을 수 있습니다.
원본 WebP는 이미지에 따라 손실 압축보다 클 수 있습니다.

## 실행

```sh
npm run assets:register-backgrounds:dry
npm run assets:register-backgrounds
npm run assets:test-backgrounds
```

`--dry-run`은 원본을 메모리에서 검증·변환하고 예정 DB 행과 경로를 출력합니다.
R2/DB 쓰기, archive 이동, 등록 상태 파일 생성은 하지 않습니다.
온라인 dry-run은 읽기 결과의 파생 해시 캐시(`.cache`)를 로컬에 저장합니다.
필수 비공개 환경변수가 없으면 **오프라인 dry-run**으로 동작하며 운영 중복·권한은 미검증이라고 표시합니다.
환경변수가 모두 있으면 기존 DB와 원본을 읽어 중복·충돌을 검사합니다.
미완료 실행 기록이 있으면 dry-run을 중단하고 실제 실행에서 복구하도록 안내합니다.

실행 요약에 성공/건너뜀/실패/등록예정/복구 개수를 출력합니다. 실패 시 종료 코드는 1입니다.
실제 실행에서 실패하면 다음 팩을 등록하지 않습니다. 오류를 해결한 뒤 동일 명령을 재실행하세요.
현재 지원하는 CLI 옵션은 `--dry-run`, `--pack PACK_ID`, `--refresh-hash-cache`, `--help`입니다. watch 모드는 포함하지 않습니다.

## 중복 검사

파일 바이트가 아니라 EXIF 회전·sRGB·RGBA로 정규화한 **픽셀 SHA-256**으로 비교합니다.
같은 팩의 중복 이미지는 오류로 처리합니다. 기존 배경의 원본을 페이지 단위 DB 조회 후
R2에서 읽고 비교하며 R2에 없을 때만 기존 Supabase Storage에서 읽습니다.
R2 신규 원본에는 source pixel hash도 메타데이터로 기록합니다.
비교 실패는 전체 등록을 중단하며 신규 이미지로 간주하지 않습니다.

다른 팩/기존 DB에 동일 이미지가 있으면 해당 **팩 전체를 건너뛰고 원본은 inbox에 유지**합니다.
이 정책은 일부 아이템만 빠진 팩이 자동 공개되는 것을 방지합니다.
JPEG 재압축·리사이즈·색상 변경처럼 픽셀이 달라진 이미지는 다른 이미지입니다.
첫 실행은 기존 원본 전체를 다운로드·디코딩해야 하므로 오래 걸릴 수 있습니다.
중복 검사 중 완료 개수/전체 개수·퍼센트·캐시 사용 수·새 검사 수·경과 시간·현재 파일과
처리 단계를 출력합니다. 10개 완료마다 출력하며, 대기 중에도 5초마다 진행 상태를 표시합니다.

검사 해시는 `tools/background-assets/.cache/pixel-hashes.json`에 저장합니다.
R2는 `packs/backgrounds/` 목록을 페이지당 최대 1,000개씩 일괄 조회합니다.
캐시는 목록의 ETag·크기·수정 시각(또는 Supabase Storage info의 버전)이
일치할 때만 사용합니다. 변경·삭제·저장소 전환은 재검사하거나 오류로 중단합니다.
R2 응답 본문을 읽은 버전으로 캐시를 기록하고, Supabase 원본은 읽기 전후 버전이
같을 때만 캐시합니다. 변경 확인 정보가 없는 원본은 캐시를 사용하지 않습니다.
알고리즘 버전과 저장소 범위도 검증하며 손상된 JSON 캐시는 다시 생성합니다.
원격 검증이 실패하면 예전 캐시로 통과시키지 않습니다.

10개마다 캐시를 원자적으로 저장하고 정상 종료/요청 오류 시에도 저장합니다.
Ctrl+C/강제 종료 후에도 마지막 체크포인트까지 남아 다음 실행에 재사용됩니다.
캐시 파일은 등록 복구용 `.state` 기록과 분리되어 있어 지워도 원격 데이터를 변경하지 않습니다.
강제 재검사하려면 다음 명령을 사용하세요.

```sh
npm run assets:register-backgrounds:dry -- --refresh-hash-cache
```

R2 요청(업로드·조회·삭제 포함)과 Supabase HTTP 요청은 기본 **30초**로 제한합니다.
다운로드 헤더 수신뿐 아니라 본문 읽기에도 제한 시간이 적용됩니다.
제한 시간 초과 시 요청을 취소하고 오류로 종료합니다. 실제 등록 중의 실패는 기존 보상/복구
절차를 따릅니다. 필요하면 `.env`의 `BACKGROUND_ASSET_REQUEST_TIMEOUT_MS`를 조절하세요.
변경되지 않은 R2 원본은 개별 HEAD/다운로드 없이 목록과 캐시만으로 확인합니다.
목록에 없거나 변경 정보가 부족한 원본은 개별 HEAD 및 기존 Storage 대체 조회로 확인합니다.
새 원본·변경 원본·강제 새 검사는 다운로드하고 픽셀 해시를 계산합니다.
목록 조회가 실패하면 검사도 중단하며 오래된 캐시로 통과시키지 않습니다.
목록 조회를 포함한 검사 소요 시간을 출력합니다.

완료 기록과 manifest가 같으면 재실행을 건너뜁니다. 온라인에서는 원격 등록도 다시 확인합니다.
완료한 manifest를 편집하거나 `.state`를 지우면 이 재실행 기록은 사용할 수 없습니다.
외부 관리자나 다른 컴퓨터에서 동시에 같은 이미지/제목을 신규 등록하는 작업까지 원자적으로
차단하지는 않습니다. 실행 중에는 다른 등록 작업을 함께 수행하지 마세요.

## 실패 처리 및 복구

R2와 Supabase에는 공통 트랜잭션이 없습니다. 따라서 무조건적인 즉시 원자성 대신
**durable journal + 보상 삭제 + 다음 실행 복구**를 사용합니다.

1. 변경 전에 `.state/{runUUID}.json`에 예정 행·객체 키·원본 해시를 기록하고 fsync합니다.
2. R2 파일을 덮어쓰지 않는 조건부 PUT으로 올립니다. 실행 토큰과 출력 해시를 메타데이터에 기록합니다.
3. `shop_packs`를 `is_active=false`로 INSERT하고 `shop_pack_items`를 INSERT합니다.
   기존 모바일 저장 필드만 사용합니다. upsert하지 않습니다.
4. R2 크기/출력 해시 메타데이터·DB 행을 확인하고 팩 활성 상태를 반영합니다.
5. committed 기록을 저장한 뒤 원본을 `archive/{category}/{subcategory}/{packId}/`에 이동합니다.
   별도 지정 썸네일 원본도 함께 이동합니다. done 상태를 기록합니다.

업로드/DB 실패 시 이번 실행의 ID와 고유 이미지 경로로 DB 행을 제한해 삭제한 뒤,
실행 토큰이 일치하는 R2 객체만 삭제합니다. DB 삭제 실패 시 DB가 참조할 수 있는 파일은 보존합니다.
정리 실패·네트워크 단절·강제 종료로 일시적인 잔여 행/객체가 남을 수 있습니다.
이때 원본은 보존하고 다음 실제 실행에서 **새 작업보다 먼저 복구**합니다.
복구가 실패하면 새 등록은 진행하지 않습니다.

committed 이후 archive 실패는 DB/R2 등록을 롤백하지 않습니다. 다음 실행에서 등록 상태를
검증하고 이동을 재개합니다. 기존 archive 파일은 덮어쓰지 않고 바이트 해시가 같을 때만
중단된 복사/이동으로 인정합니다. 등록 이후 편집된 원본은 삭제하지 않습니다.

`.state`와 archive를 함께 보관하세요. 기록을 수동 삭제하면 자동 복구를 잃습니다.
동일 컴퓨터의 동시 실행은 PID 잠금으로 막고 종료된 프로세스의 잠금은 다음 실행이 회수합니다.
손상된 잠금은 실행 중인 프로세스가 없는지 확인한 뒤 수동 정리가 필요합니다.

운영 DB의 테이블 타입·제약조건·트리거·RLS는 저장소에 정의가 없습니다.
본 도구는 기존 코드 필드와 실제 API 응답을 사용하며 DB 스키마를 변경하지 않습니다.
먼저 dry-run으로 확인하고 실제 등록은 운영 자격증명이 갖춰진 환경에서 실행하세요.


## 이미지 생성 스킬

`dakkusiru-background-pack` 스킬은 Codex의 내장 이미지 생성 도구로 배경을 만든 뒤
크기 보정·inbox 저장·기존 manifest에 새 팩 추가·미리보기·팩별 dry-run까지 진행합니다.
등록은 이미지와 검증 결과를 사용자가 확인한 뒤 명시적으로 요청했을 때 실행합니다.
스킬 원본은 `skill/dakkusiru-background-pack/SKILL.md`에 있습니다.

```text
$dakkusiru-background-pack 파스텔 그리드 배경 6장을 무료 팩으로 만들어줘.
```

이미지 생성 도구가 반환한 경로와 팩 메타데이터를 담은 config를 `.cache`에 저장한 뒤
스킬이 다음 로컬 보조 도구를 실행합니다. source 원본은 삭제하지 않습니다.

```sh
node tools/background-assets/prepare-generated.mjs tools/background-assets/.cache/pack-config.json
npm run assets:register-backgrounds:dry -- --pack NEW_PACK_ID
```

보조 도구는 명시적인 `resize: "cover"` 설정을 받아 중앙 크롭/리사이즈로
2048×2732 PNG를 만들고 기존 폴더·팩 항목은 덮어쓰지 않습니다.
실패한 부분 생성 파일은 보존하며, manifest 변경 전 사본은 `.cache`에 저장합니다.

`--pack`은 manifest에 있는 팩 하나만 준비·등록합니다. 기존 원격 배경의 중복 검사는
여전히 전체를 확인하며 전역 미완료 journal도 먼저 처리합니다.
선택한 팩 이외의 manifest 항목을 지우거나 변경하지 않습니다.
