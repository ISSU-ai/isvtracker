# ISV Partner Ops 사용자 온보딩 가이드

## 1. 이 도구의 역할

ISV별 현재 단계, 업무 상태, 최근 활동, 다음 액션을 한곳에서 확인하고 주간 보고에 필요한 변경만 남기는 업무 트래커입니다.

운영 원칙은 간단합니다.

> Google Sheets가 기준 저장소이고, 웹 화면은 확인·수정·요약을 위한 작업 화면입니다.

## 2. 시작 전 확인

- 웹 화면 상단에 `Google Sheets 연결됨`이 표시되는지 확인합니다.
- `Settings → Google Sheets connection`에서 연결 상태를 확인할 수 있습니다.
- 현재 Apps Script 접근 허용 계정은 `wonzero@mz.co.kr`, `heeyeon.k@mz.co.kr`입니다.
- `로컬 저장 전용`으로 표시되면 해당 브라우저에만 저장되므로 운영 데이터 수정에는 사용하지 않습니다.

## 3. 새로운 ISV 등록 방법

1. `Partners` 화면에서 `파트너 등록`을 엽니다.
2. ISV명, Owner, 현재 단계, Next Action, 기한을 입력합니다. Partner ID는 서버에서 자동 발급합니다.
3. 선택한 단계의 `Stage_Template` 기본 Task가 `Tasks`에 함께 생성됩니다. 각 업무의 기한은 템플릿 SLA를 기준으로 설정됩니다.
4. 등록을 저장하면 파트너, 기본 업무, 등록 Activity가 Google Sheets에 기록되고, 재조회 확인 후 Overview로 이동합니다.

Google Sheets에 연결되지 않았거나 최신 Apps Script가 배포되지 않았다면 등록할 수 없습니다. `GTM Onboarding`은 현재 `Stage_Template`에 기본 Task가 없어 파트너 행과 등록 Activity만 생성됩니다. 해당 단계의 업무 템플릿이 필요하면 담당자가 먼저 Stage_Template에 정의해야 합니다.

## 4. 매일 사용하는 흐름

1. `Overview`에서 `Needs update`, `Stalled`, `Blocked` 파트너를 먼저 확인합니다.
2. ISV를 선택하고 `Stage tasks` 또는 `Tasks` 화면에서 상태를 바꿉니다.
3. 업무별 `진행 입력`을 열어 진행 내용, 상태, 다음 액션, 기한, 대기 상대, 블로커, 근거 링크를 기록합니다.
4. 저장하면 `Tasks`의 현재 정보가 갱신되고, 각 저장 내용은 `Activities`에 누적됩니다. 오래된 진행 내용도 이력에서 확인할 수 있습니다.
5. 파트너 전체의 Next Action이나 블로커가 바뀌면 `빠른 업데이트`에서 파트너 수준 정보를 갱신합니다.
6. 저장 후 확인 메시지를 확인하고, 의심되면 새로고침해 해당 Task와 `Activities`를 다시 확인합니다.

## 5. Status 입력 기준

| Status | 사용 기준 |
| --- | --- |
| `Not Started` | 아직 시작하지 않은 업무 |
| `In Progress` | 내부적으로 진행 중인 업무 |
| `Waiting External` | ISV·고객·파트너의 회신이나 자료를 기다리는 업무 |
| `Blocked` | 내부 지원이나 의사결정 없이는 진행할 수 없는 업무 |
| `Done` | 결과물이 확인되고 완료된 업무 |
| `Deferred` | 의도적으로 뒤로 미룬 업무. 사유를 Activity에 남김 |
| `Dropped` | 파트너십 또는 해당 업무를 진행하지 않기로 결정함. 결정 근거를 Activity에 남김 |

상태는 추측으로 바꾸지 않습니다. 메일이나 미팅 기록으로 완료가 확인되지 않으면 `Done`으로 바꾸지 않고 `Waiting External` 또는 `In Progress`로 유지합니다.

`Waiting External`은 외부 회신 대기 상태이며 자동으로 Blocked 처리되지는 않습니다. 내부 결정이나 지원 없이는 진행할 수 없을 때 `Blocked`를 선택하고, 사유는 Quick Update의 Blocker에 기록합니다.

웹 화면의 Health 규칙은 다음과 같습니다. 최근 Activity가 3일 이상이면 `Needs Update`, 5일 이상 경과하거나 Next Action 기한이 지났으면 `Stalled`, Blocker가 입력되었거나 Task가 `Blocked`이면 `Blocked`입니다. 이 계산은 달력 날짜 기준입니다.

## 6. 주간 보고 만들기

1. `Weekly report`를 엽니다.
2. 화면의 초안에서 이번 주 월요일부터 오늘까지의 Activity와 현재 Needs Update / Stalled / Blocked 상태, Next Action·담당자·기한을 확인합니다.
3. `보고 내용 복사`를 눌러 주간 보고 문서나 메시지에 붙여넣습니다.
4. 공유 전에 Activity와 액션이 최신이고 사실과 일치하는지 담당자가 확인합니다. Activity가 없는 경우 초안에 이를 표시하므로, 기록되지 않은 성과를 추정해 채우지 않습니다.

보고서 초안은 별도 저장되지 않으며 현재 연결된 Google Sheets 또는 로컬 데이터에서 매번 생성됩니다. Google Sheets 연결 여부는 상단 상태 표시에서 확인하세요. `로컬 저장 전용`이면 해당 브라우저의 데이터만 대상으로 하므로 팀 공유용 보고 근거로 사용하지 않습니다.

## 7. 주간 보고 전 점검

- `Blocked`와 `Stalled` ISV에 다음 액션과 담당자가 있는가
- 모든 Active ISV에 Due Date가 있는가
- 보고 기간 중 실제 변화가 없었던 ISV가 초안에서 활동 없음으로 표시되는가
- Task Status 변경과 Quick Update가 각각 `Tasks`, `Activities`, `Partners`에 반영되었는가
- 보고서에 넣을 근거가 Activity 요약 또는 원문 링크로 남아 있는가

## 8. 문제가 생겼을 때

### 웹 화면이 Sheets와 다를 때

새로고침합니다. 그래도 다르면 `Settings`에서 Apps Script URL과 연결 상태를 확인합니다.

### `로컬 저장으로 동작 중`이라고 표시될 때

Apps Script 배포 권한, URL의 `/exec` 포함 여부, 회사 계정 로그인을 확인합니다. 운영 중에는 로컬 모드로 계속 입력하지 않습니다.

### Task 변경 이력이 Activities에 보이지 않을 때

Apps Script가 최신 버전으로 배포되었는지 확인합니다. 코드를 수정했더라도 기존 웹앱 배포가 이전 버전을 가리키면 파트너 등록이나 상세 진행 입력, Activity 기록이 실패할 수 있습니다. 배포 후 화면에서 저장하고 `Partners`, `Tasks`, `Activities`를 확인합니다.

### 상태 변경 후 저장 확인이 지연될 때

같은 값을 반복해서 클릭하지 말고 잠시 기다린 뒤 새로고침합니다. Sheets에 이미 기록되었을 수 있으므로 먼저 실제 값을 확인합니다.

## 9. 데이터 운영 원칙

- Google Sheets의 탭 이름과 헤더를 임의로 변경하지 않습니다.
- 개인정보·민감한 계약 내용은 Activity 요약에 원문 그대로 넣지 않습니다.
- 업무 변화가 없는 날에는 억지로 Activity를 만들지 않습니다.
- 중요한 상태 변경은 사람이 근거를 확인한 뒤 확정합니다.
