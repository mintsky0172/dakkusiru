# iOS 코인 충전 영수증 검증 설정

## 구현된 흐름

1. 앱이 익명 또는 정식 Supabase 사용자 ID를 `appAccountToken`으로 넣어 결제합니다.
2. 앱은 거래 ID와 상품 ID만 `verify-coin-purchase` 함수로 보냅니다.
3. 서버가 Apple App Store Server API에서 현재 거래를 조회하고 Web Crypto 기반의
   PKI.js와 jose로 서명·인증서 체인·OCSP 폐기 상태를 검증합니다.
   Apple 공식 Node 검증기는 Supabase 런타임의 미지원 암호화 기능을 호출하므로
   사용하지 않습니다. Apple 루트에 대한 신뢰, 인증서 용도 OID, 유효기간, ES256 서명,
   서명된 OCSP 응답의 권한·대상·상태·유효 시간을 모두 검사하며 실패 시 지급하지 않습니다.
   Apple API 인증 JWT는 Web Crypto 기반 `jose`로 서명하고 기본 `fetch`로 요청합니다.
   키 검사에는 Node 전용 `createPrivateKey`를 사용하지 않습니다.
4. 번들 ID, 상품, 환경, 소모성 상품 여부, 환불·취소 여부, 구매 수량 및 계정 연결을
   확인합니다. 클라이언트가 보낸 코인 수나 사용자 ID는 신뢰하지 않습니다.
5. 서버 상품 목록의 금액으로 코인을 지급합니다. 동일 거래는 한 번만 지급합니다.
6. 앱은 지급 성공 응답을 받은 후에만 `finishTransaction`을 호출합니다.
   앱 종료·통신 실패 후에는 결제 화면의 ‘충전 확인 다시 시도’로 미완료 거래를 처리합니다.

현재 iOS만 지원합니다. Android 결제는 계속 비활성화됩니다.

## 1. 추가 SQL 적용

SQL Editor에서 `migrations/202610150003_verified_apple_coins.sql`을 실행합니다.
앞의 001·002 마이그레이션이 적용되어 있어야 합니다. 기존 파일 전체를 다시 실행하지 않습니다.

이 SQL은 서버 전용 지급 RPC를 추가합니다. 사용자 세션으로는 호출할 수 없습니다.
익명 계정의 결제가 로그인 이후 도착해도 서버의 이전 기록을 따라 현재 계정에 지급합니다.
이전 기록과 관계없는 계정이 거래를 제출하면 거절합니다.

## 2. Apple 자격 증명 준비

App Store Connect → Users and Access → Integrations → In-App Purchase에서
서버 API용 키를 생성합니다. Key ID, Issuer ID와 내려받은 `.p8` 개인 키가 필요합니다.
일반 App Store Connect API 키가 아니라 In-App Purchase 용도에 맞는 키를 사용합니다.

Apple PKI의 Apple Root Certificates에서 루트 인증서를 내려받습니다.
각 인증서 원본(DER 또는 PEM) 파일을 base64로 변환한 문자열들을 JSON 배열로 준비합니다.
예: `["첫 번째 인증서의 base64", "두 번째 인증서의 base64"]`.
개인 키와 인증서 내용을 앱의 `.env`, `EXPO_PUBLIC_*`, Git에 넣지 않습니다.

참고: [Apple 공식 서버 라이브러리 설정](https://github.com/apple/app-store-server-library-node),
[Apple 루트 인증서](https://www.apple.com/certificateauthority/).

## 3. Supabase Edge Function Secrets 설정

Supabase Dashboard의 Edge Functions → Secrets에 다음 값을 설정합니다.

| 이름 | 값 |
|---|---|
| `APPLE_BILLING_ENABLED` | 처음에는 `false`, 모든 설정을 마친 후 `true` |
| `APPLE_ENVIRONMENT` | 테스트는 `Sandbox`, 운영은 `Production` |
| `APPLE_BUNDLE_ID` | `com.mintsky0172.dakkusiru` |
| `APPLE_KEY_ID` | 발급된 Key ID |
| `APPLE_ISSUER_ID` | 발급된 Issuer ID |
| `APPLE_PRIVATE_KEY` | `.p8` 파일 전체 내용. 실제 줄바꿈 또는 `\n` 모두 지원 |
| `APPLE_ROOT_CERTIFICATES_JSON` | 위에서 준비한 base64 문자열의 JSON 배열 |
| `APPLE_APP_ID` | App Store Connect의 숫자 Apple ID. Production에서는 필수 |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Edge Functions의
기본 서버 환경변수를 사용합니다. service-role 키는 앱에 전달하지 않습니다.

Sandbox와 Production을 같은 사용자 지갑에 섞어 사용하지 마세요. Sandbox 테스트는
별도 Supabase 스테이징 프로젝트에서 진행하는 것을 권장합니다. 환경은 서버에서만
결정하며, 앱 요청에 따라 Sandbox로 자동 전환하지 않습니다.

## 4. 함수 배포

프로젝트가 Supabase CLI에 연결되어 있다면 저장소 루트에서 실행합니다.

```sh
npx supabase functions deploy verify-coin-purchase --no-verify-jwt
```

게이트웨이의 JWT 검증을 끄더라도 함수 내부에서 Supabase `auth.getUser()`로 매 요청의
사용자 토큰을 검증합니다. 익명 인증 사용자도 검증된 사용자 ID가 있어야 호출할 수 있습니다.
익명 키만 전달한 요청이나 임의 토큰은 허용하지 않습니다.

설정을 마친 뒤 `APPLE_BILLING_ENABLED=true`로 바꾸고 앱의 코인 충전 화면에 다시
진입합니다. 앱은 서버 설정과 SQL 준비 상태를 확인한 경우에만 결제를 활성화합니다.
설정 누락, 함수 미배포 또는 Android에서는 ‘충전 준비 중’ 상태를 유지합니다.

## 5. 실기기 테스트

- App Store Connect에 기존 네 상품을 소모성 상품으로 등록합니다.
  `dakkusiru.coin_1000`, `dakkusiru.coin_3000`, `dakkusiru.coin_5000`, `dakkusiru.coin_10000`.
- Sandbox 계정 또는 TestFlight에서 결제합니다. Xcode 로컬 StoreKit 구성의 거래는
  Apple 서버에 존재하지 않으므로 이 서버 검증에서는 인정하지 않습니다.
- 1,000 / 3,000 / 5,500 / 11,500 코인이 각각 지급되는지 확인합니다.
- 지급 기록은 `verified_coin_credits`, 잔액은 `coin_wallets`에서 확인합니다.
- 검증 요청을 반복하거나 앱을 종료·재실행해도 동일 거래가 한 번만 지급되는지 확인합니다.
- 결제 후 네트워크를 끊었다가 복구하고 ‘충전 확인 다시 시도’를 눌러 확인합니다.
- 게스트 결제 후 로그인한 상황에서도 거래 소유권과 지급 계정이 맞는지 확인합니다.
- 이미 지급한 뒤 거래 완료 처리만 실패했다면 재시도는 추가 지급 없이 거래를 완료합니다.

`appAccountToken` 없이 생성된 과거 거래는 자동 지급하지 않습니다. 기존 코인과 과거
영수증 이전은 별도의 대조 작업이 필요합니다. 관리자 화면의 표시 잔액은 관리자용
고정값이므로 실제 충전 검증은 일반·게스트 계정의 지갑으로 확인합니다.

## 검증 범위와 남은 작업

코드 변경만으로 서버 함수·Secrets·SQL은 배포되지 않습니다. 실제 Apple 자격 증명과
Sandbox 거래를 이용한 검증은 별도로 진행해야 합니다.

현재 검증 시점에 이미 취소·환불된 거래는 거절합니다. 지급 이후 발생하는 환불의
자동 반영은 App Store Server Notifications V2와 환불 원장 처리가 추가로 필요합니다.
이 기능은 이번 구현에 포함되지 않았습니다. Google Play 검증도 별도 작업입니다.

SQL 테스트는 기존 `supabase/tests/pack-acquisitions.test.mjs`에 포함되어 있습니다.
거래 내용 검증 테스트는 다음 명령으로 실행합니다.

```sh
node --test supabase/tests/apple-validation.test.cjs
deno test --config supabase/functions/verify-coin-purchase/deno.json --allow-env supabase/functions/verify-coin-purchase/verification.test.ts
deno test --config supabase/functions/verify-coin-purchase/deno.json --allow-env supabase/functions/verify-coin-purchase/apple-verifier.test.ts
```
