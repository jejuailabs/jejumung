# 제주멍

실제 제주 걷기 영상 위에 남녀 여행자 이미지 애니메이션을 합성하고, 사진 속 선베드·해먹·패들보드·벤치에서 쉬는 웹 체험판입니다. 다른 접속자와의 만남·채팅은 아직 구현하지 않았습니다.

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

걷는 배경은 원본의 0.72배속이며, 시작할 때 550ms 동안 부드럽게 속도를 올립니다. 여행자는 sprite-gen으로 분리·정렬한 새 남녀 보행 아틀라스를 사용합니다. 보행 한 주기는 1.6초이고, 영상 진행량과 연결해 정지·버퍼링 때 혼자 걸음을 계속하지 않습니다. 걷기와 멈춤 사이에는 짧은 전환을 적용했습니다. 쉼터의 시점별 앉기·눕기 그림은 유지합니다. sprite-gen은 로컬 추출·조합·검사에 사용했고, 원본 행 그림은 기본 내장 이미지 생성 도구로 만들었습니다. 별도 생성 API와 유료 보간 서비스는 사용하지 않았습니다.

## Firebase 연결 범위

`dist/firebase-web.js`는 제공한 `kakaobot-6fea2` 프로젝트의 공개 웹 설정으로 앱과 무료 Google Analytics만 초기화합니다. Firebase SDK는 Google 공식 CDN의 13.1.0으로 고정했습니다. 광고 차단이나 네트워크 오류로 통계를 못 불러와도 산책 엔진은 독립적으로 동작합니다.

Firebase Auth·DB·Storage·Functions·App Hosting은 이번 배포에서 사용하거나 활성화하지 않습니다. 기존 Firebase 프로젝트의 데이터와 보안 규칙은 수정하지 않습니다. Firebase 관리자 서비스 계정 JSON은 필요하지 않으며 브라우저·GitHub·Vercel에 넣으면 안 됩니다.

## 비용 범위

비상업적 체험판을 기존 Vercel Hobby 무료 범위에서 배포합니다. 유료 업그레이드, 애드온, 도메인 구매, 사용량 과금 자원은 추가하지 않습니다. Hobby 한도를 넘으면 기능이 제한될 수 있으며 상업적 운영에는 별도 플랜 검토가 필요합니다. Google Analytics는 무료이며 BigQuery 등의 별도 연결은 추가하지 않습니다.

## 자산

코스 영상은 제공한 원본의 메타데이터를 제거한 HLS 파생본입니다. 원본 MOV와 로컬 자료실·테스트 기록·관리자 키는 저장소에 포함하지 않습니다. Three.js r170 (MIT), hls.js 1.6.19 (Apache 2.0)의 라이선스는 `dist/vendor/`에 포함합니다. 캐릭터는 고정 시점 2D 이미지 프레임으로 표시하며 자유 시점 3D 복원은 아닙니다.
