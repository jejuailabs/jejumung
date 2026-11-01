# 제주멍

실제 제주 걷기 영상 위에 남녀 여행자 이미지 애니메이션을 합성하고, 한 구역 15석의 선베드·해먹·패들보드·벤치에서 다른 접속자와 함께 쉬는 웹 체험판입니다. 실시간 자리 점유, 옆 구역 이동, 구역별 문자 대화를 지원합니다.

## Vercel 배포

- GitHub: `jejuailabs/jejumung`, production branch `main`
- Framework Preset: **Other** (Next.js 아님)
- Root Directory: `./`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: 비움. npm 의존성 설치가 필요하지 않습니다.

`vercel.json`에 위 설정이 포함되어 있습니다. `npm run check`로 영상 HLS 참조·길이, 96개 캐릭터 프레임, 파일 경계와 개인 키 포함 여부를 검사합니다. `npm start`는 로컬 127.0.0.1:4176에서 체험을 엽니다.

## GitHub 자동 배포

`jejuailabs/jejumung` 저장소를 Vercel `jejuai/jejumung`에 연결합니다. `main`에 푸시하면 Vercel이 `npm run build`를 실행하고 성공한 결과를 https://jejumung.vercel.app 에 공개합니다. 수정·커밋·푸시는 이 README가 있는 폴더에서 수행합니다. 기존 Hobby 무료 범위를 유지하며 유료 플랜·애드온으로 자동 전환하지 않습니다.

## 느긋한 걷기

걷는 배경은 원본의 0.72배속이며, 시작할 때 550ms 동안 부드럽게 속도를 올립니다. 여행자는 sprite-gen으로 분리·정렬한 새 남녀 보행 아틀라스를 사용합니다. 보행 한 주기는 1.6초이고, 영상 진행량과 연결해 정지·버퍼링 때 혼자 걸음을 계속하지 않습니다. 걷기와 멈춤 사이에는 짧은 전환을 적용했습니다. sprite-gen은 로컬 추출·조합·검사에 사용했고, 원본 행 그림은 기본 내장 이미지 생성 도구로 만들었습니다. 별도 생성 API와 유료 보간 서비스는 사용하지 않았습니다.

## 15석 쉼터

바다 선베드·해먹·벤치·패들보드, 숲 해먹·벤치의 6종류가 있습니다. 각 종류에 001–999 구역을 필요할 때 사용하며, 별도 서버를 구역마다 생성하지 않습니다. 한 화면 3행×5석이고 인물과 가구를 함께 그린 합성 자산으로 접촉과 비율을 맞춥니다. 이웃 구역은 두 배경과 배치 변형을 번갈아 사용합니다. 만석이면 다음 빈 구역으로 자동 이동하며, 최대 12개 구역을 검사한 후 안내합니다. 실제 운영 한도는 아래 무료 DB의 전체 연결 한도를 따릅니다.

`/engine?clip=IMG_0575&room=coast_sunbed_001` 링크로 같은 구역에서 만납니다. `loungePreview=15`를 덧붙이면 **가상 15인 배치 미리보기**가 열리며 Firebase에 접속하거나 대화하지 않습니다. 일반 화면에는 실제 접속자만 표시합니다. 벤치에서는 앉고 나머지는 눕습니다. 산책 복귀 시 저장한 영상 시점에서 이어집니다.

서버 규칙은 s00–s14만 허용하고, 다른 사람의 자리 수정과 메시지 명의 도용을 막습니다. 한 사용자 최근 5개 메시지를 유지하며 1.5초 전송 간격을 서버에서 검사합니다. 자리를 떠나면 내 메시지를 삭제하고, 비정상 종료 시 Firebase onDisconnect로 자리와 메시지를 정리합니다. 연결 끊김 감지는 서버 상태에 따라 지연될 수 있습니다. 방이 공개되어 링크를 아는 익명 방문자가 들어올 수 있으며, 음성 대화나 운영자 신고 기능은 아직 없습니다.

## Firebase 연결 범위

`dist/firebase-web.js`는 제공한 `kakaobot-6fea2` 프로젝트의 공개 웹 설정으로 앱과 무료 Google Analytics만 초기화합니다. Firebase SDK는 Google 공식 CDN의 13.1.0으로 고정했습니다. 광고 차단이나 네트워크 오류로 통계를 못 불러와도 산책 엔진은 독립적으로 동작합니다.

사용자가 승인한 별도 **결제 미연결 Spark 프로젝트 `projecthub-97b64`**의 제주멍 웹 앱과 익명 Auth, Singapore Realtime Database를 사용합니다. 데이터 경로는 `jejumungV5/rooms`에 한정하며, 기존 호스팅을 배포하거나 변경하지 않습니다. 이 프로젝트에 기존 웹 앱·DB·Auth 구성이 없음을 확인한 뒤 추가했습니다. `kakaobot-6fea2`에는 DB를 만들지 않았습니다. Storage·Functions·App Hosting·Identity Platform 유료 업그레이드는 사용하지 않습니다. 관리자 서비스 계정 JSON은 필요하지 않으며 브라우저·GitHub·Vercel에 넣으면 안 됩니다.

규칙 변경: `node tools/build-lounge-rules.mjs` 후 `firebase deploy --only database --project projecthub-97b64`. 이 명령은 기존 호스팅을 건드리지 않습니다. `node tools/test-lounge-rules.mjs`는 998 QA구역에서 두 테스트 계정으로 권한·충돌·속도 제한을 검사하고 정리합니다. 일반 구역에 테스트 메시지를 쓰지 마세요.

## 비용 범위

비상업적 체험판을 기존 Vercel Hobby 무료 범위에서 배포합니다. 무료 Spark RTDB는 **전체 동시 연결 100개, 저장 1GB, 월 다운로드 10GB** 한도이며 한도 초과 시 제한됩니다. 구역 수를 늘려도 전체 접속 한도가 늘어나지는 않습니다. 결제 계정·자동 유료 전환·종량제 초과 사용은 연결하지 않았습니다. 유료 업그레이드, 애드온, 도메인 구매, 사용량 과금 자원은 추가하지 않습니다. Hobby 한도를 넘으면 기능이 제한될 수 있으며 상업적 운영에는 별도 플랜 검토가 필요합니다. Google Analytics는 무료이며 BigQuery 등의 별도 연결은 추가하지 않습니다.

## 자산

코스 영상은 제공한 원본의 메타데이터를 제거한 HLS 파생본입니다. 원본 MOV와 로컬 자료실·테스트 기록·관리자 키는 저장소에 포함하지 않습니다. Three.js r170 (MIT), hls.js 1.6.19 (Apache 2.0)의 라이선스는 `dist/vendor/`에 포함합니다. 캐릭터는 고정 시점 2D 이미지 프레임으로 표시하며 자유 시점 3D 복원은 아닙니다.
