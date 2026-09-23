# ISV Partnership Tracker 설치 가이드

## 현재 템플릿

[ISV Partnership Tracker - Template](https://docs.google.com/spreadsheets/d/1Om2IxNZLlsyWnrry9U-ysAJlv-oE2uJSSSwNMg_ph7k/edit)

조직 내 사용자가 편집할 수 있도록 `mz.co.kr` 도메인 편집 권한을 설정해 두었습니다.

## 시트 구조

- `Dashboard`: 예외 상태와 KPI 확인
- `Partners`: ISV 기본 정보, Stage, Health, Next Action
- `Tasks`: 단계별 업무와 Status
- `Activities`: 회의·이메일·통화 등 실제 변화 기록
- `Stage_Template`: Stage별 기본 업무와 Exit Criteria
- `Lists`: Status와 운영 규칙

## Apps Script 연결

1. 위 Google Sheet를 엽니다.
2. `확장 프로그램 → Apps Script`를 선택합니다.
3. 저장소의 [`isv-tracker-apps-script.gs`](./isv-tracker-apps-script.gs) 내용을 붙여넣습니다.
4. `배포 → 새 배포 → 웹 앱`을 선택합니다.
5. 실행 주체는 본인, 액세스 권한은 조직 정책에 맞게 설정합니다.
6. 배포 URL의 `.../exec` 주소를 복사합니다.

Apps Script 코드를 수정한 경우에는 기존 배포의 편집(연필) 메뉴에서 새 버전을 배포해야 변경 내용이 실제 웹앱에 적용됩니다. 기존 배포를 편집해 새 버전을 지정하면 프론트엔드에 설정한 `/exec` URL을 유지할 수 있습니다. 웹 파트너 등록과 업무별 진행 내용 저장을 사용하려면 저장소의 최신 `isv-tracker-apps-script.gs`를 반영하고 반드시 새 버전을 배포하세요.

보안상 `모든 사용자` 공개보다 조직 계정 접근을 우선 권장합니다. 외부 사용자까지 접근시켜야 하는 경우에는 Apps Script 웹앱을 공개하기 전에 파트너 개인정보와 쓰기 권한 범위를 별도로 검토해야 합니다.

## 프론트엔드 연결

로컬 모드에서는 브라우저 `localStorage`를 사용합니다. Google Sheet API를 연결하려면 실행 전에 환경변수를 설정합니다.

현재 배포된 Apps Script Web App URL:

```text
https://script.google.com/a/macros/mz.co.kr/s/AKfycbwZKrQkU_Y7kO-31wtM-kKfrHGwN1VK_GNxjScwX7vLhW5GB1KZhjl5IbLQ0X5_XRHAxw/exec
```

현재 Apps Script는 `wonzero@mz.co.kr`, `heeyeon.k@mz.co.kr`만 사용할 수 있도록 제한되어 있습니다.

시트의 도메인 편집 권한과 Apps Script API 허용 계정은 별도 설정입니다. 현재 API 허용 목록에 없는 사용자는 화면에서 Sheet 데이터를 불러오거나 저장할 수 없습니다.

```bash
VITE_ISV_TRACKER_API_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec npm run dev -- --host 127.0.0.1
```

API 확인:

```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?action=health
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?action=bootstrap
```

## GitHub Pages 배포

현재 저장소는 `ISSU-ai/isvtracker`이며, Vite가 GitHub 프로젝트 페이지용 `/isvtracker/` 경로로 빌드합니다. 트래커가 사이트 루트에 표시됩니다.

1. GitHub 저장소에 변경사항을 커밋하고 푸시합니다.
2. 저장소의 `Settings → Pages`에서 배포 소스를 `Deploy from a branch`로 설정하고 `gh-pages` 브랜치의 `/ (root)`를 선택합니다. `gh-pages` 브랜치가 아직 없으면 아래 배포 명령이 생성합니다.
3. 저장소 루트에서 lockfile 기준으로 `npm ci`를 실행합니다.
4. 배포합니다.

```bash
npm run deploy
```

기본 GitHub Pages 도메인을 사용하는 경우 사이트 주소는 `https://issu-ai.github.io/isvtracker/`입니다. 조직에서 커스텀 도메인을 설정했다면 해당 도메인을 사용하세요.

기본 배포에는 Apps Script URL을 환경변수로 주입하지 않으므로 트래커는 `로컬 저장 전용`으로 시작합니다. 팀 공용 Sheet에 연결하려면 웹 화면의 `Settings`에서 Apps Script `/exec` URL을 입력해 연결 테스트를 하거나, 빌드 시 환경변수를 전달합니다.

```bash
VITE_ISV_TRACKER_API_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec npm run deploy
```

Vite 환경변수는 정적 JavaScript 번들에 포함되어 브라우저에 공개됩니다. API URL을 비밀키로 취급하지 말고, 실제 데이터 접근은 Apps Script의 계정 허용 목록과 배포 권한으로 제한하세요. Apps Script 코드 변경분도 적용하려면 웹앱을 새 버전으로 배포해야 합니다.

## 운영 규칙

- `Task Status`: `Not Started / In Progress / Waiting External / Blocked / Done / Deferred / Dropped`
- `Stage Status`: 필수 Task 완료 여부를 기준으로 자동 계산
- `Health`: 웹 화면에서는 마지막 Activity 이후 경과일, Next Action 기한, Blocker/Blocked Task로 계산합니다. 3일 이상 활동이 없으면 Needs Update, 5일 이상 또는 기한 초과면 Stalled, Blocker가 있으면 Blocked입니다.
- 모든 활성 Partner는 `Next Action`, `Owner`, `Due Date`를 가져야 함
- `Activities`는 단순 셀 수정이 아니라 실제 업무 변화만 기록
- 웹 화면의 Task 상태 변경은 `Tasks` 행을 `Task ID`로 찾아 갱신하고, 같은 변경 요약을 `Activities`에 `Other` 유형으로 추가합니다. 템플릿의 Activity Type 드롭다운 허용값을 유지하기 위한 설정입니다.
- `Partners` 화면의 웹 등록은 고유 Partner ID를 발급하고 현재 단계의 `Stage_Template` Task를 `Tasks`에 생성합니다. Task 진행 입력은 `Tasks`의 Status / Due Date / Next Action / Waiting On / Blocker / Notes / Reference Link를 갱신하고, 매 저장 내용을 `Activities`에 추가합니다.
- 현재 `Stage_Template`에 `GTM Onboarding` 기본 업무가 없으므로, 이 단계로 등록하면 Task 없이 파트너만 생성됩니다. 기본 업무가 필요하면 먼저 Stage_Template에 추가하세요.
- 활동 요약은 주간 보고 초안의 근거가 됩니다. 주간 보고는 별도 저장하지 않고, 이번 주 월요일부터 오늘까지의 Activity와 현재 주의 필요 상태를 화면에서 생성합니다.

## 변경 후 확인

1. Apps Script 새 버전을 배포한 뒤 `/exec?action=health` 응답이 `status: ok`인지 확인합니다.
2. 프론트엔드 Settings에서 같은 웹앱 URL로 연결 테스트를 합니다.
3. 테스트용 Task의 상태를 변경하고, `Tasks`의 상태와 `Activities` 새 행을 확인합니다.
4. 화면 새로고침 후 변경 상태가 유지되는지 확인합니다.
5. `Weekly report`에서 활동 요약과 현재 블로커·다음 액션이 보이는지 확인합니다.
