# ISV Partner Ops

ISV 파트너십의 단계, Health, 블로커, 다음 액션과 주간 보고 초안을 관리하는 웹 앱입니다.

## 시작하기

```bash
npm ci
npm run dev
```

Google Sheets를 연결하려면 `Settings`에서 Apps Script 웹앱 `/exec` URL을 저장하거나 `.env.local`에 `VITE_ISV_TRACKER_API_URL`을 설정하세요. 환경변수는 빌드 결과에 포함되므로 비밀키를 넣지 마세요.

## 빌드와 배포

```bash
npm run build
npm run preview
npm run deploy
```

GitHub Pages는 `ISSU-ai/isvtracker` 프로젝트 경로(`/isvtracker/`)로 빌드합니다. `npm run deploy`는 빌드 결과를 `gh-pages` 브랜치에 발행하므로 저장소의 Pages 설정에서 해당 브랜치의 루트를 배포 대상으로 선택하세요.

## 운영 문서

- [설치 및 배포 가이드](./ISV_TRACKER_설치_가이드.md)
- [사용자 온보딩 가이드](./ISV_TRACKER_온보딩_가이드.md)
- [Google Apps Script API](./isv-tracker-apps-script.gs)
