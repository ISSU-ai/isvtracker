import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const initialPartners = [
  {
    id: 'portal26',
    name: 'Portal26',
    segment: 'AI Adoption Management & Security Governance',
    owner: 'Hazel',
    stage: 'GTM Onboarding',
    stageIndex: 4,
    progress: 72,
    health: 'needs-update',
    lastActivity: '2026-09-02',
    nextAction: 'Sales Kit 초안 리뷰 및 HALO 피드백 확인',
    dueDate: '2026-09-08',
    blocker: '',
    tasks: [
      { name: 'Internal Alignment with ISSU GTM, CoE, HALO', status: 'In Progress', due: '2026-07-22' },
      { name: 'Kickoff meeting', status: 'Done', due: '2026-07-29' },
      { name: 'GTM onboarding / enablement', status: 'In Progress', due: '2026-07-30' },
      { name: 'Public Release / Announcement', status: 'In Progress', due: '2026-09-07' },
      { name: 'Sales Kit 제작', status: 'In Progress', due: '2026-09-08' },
    ],
    activities: [
      { date: '2026-09-02', text: 'Portal26 Sales Kit 초안 작성 시작' },
      { date: '2026-08-30', text: 'Halo 측 PR 초안 검토 요청 발송' },
      { date: '2026-08-25', text: 'Partner Portal 계정 셋업 요청 완료' },
    ],
  },
  {
    id: 'cloudbridge',
    name: 'CloudBridge',
    segment: 'Cloud Security',
    owner: 'Jenny',
    stage: 'Partner Agreement',
    stageIndex: 3,
    progress: 58,
    health: 'on-track',
    lastActivity: '2026-09-05',
    nextAction: '계약서 redline 반영본 수령',
    dueDate: '2026-09-10',
    blocker: '',
    tasks: [
      { name: 'NDA execution', status: 'Done', due: '2026-08-19' },
      { name: 'Receive ISV agreements', status: 'Done', due: '2026-08-26' },
      { name: 'Review toxic clauses + redline', status: 'Waiting External', due: '2026-09-10' },
      { name: 'Submit groupware document', status: 'Not Started', due: '2026-09-12' },
    ],
    activities: [
      { date: '2026-09-05', text: '계약서 redline 반영 요청 전달' },
      { date: '2026-08-26', text: 'ISV agreement 수령 및 검토 시작' },
    ],
  },
  {
    id: 'secureflow',
    name: 'SecureFlow',
    segment: 'Identity & Access',
    owner: 'Hazel',
    stage: 'Qualification Card',
    stageIndex: 2,
    progress: 34,
    health: 'stalled',
    lastActivity: '2026-08-26',
    nextAction: 'Qualification scorecard 정보 보완',
    dueDate: '2026-09-04',
    blocker: 'US 시장 레퍼런스 부족',
    tasks: [
      { name: 'Vendor readiness 확인', status: 'Done', due: '2026-08-18' },
      { name: 'Initial meeting / 자료 수집', status: 'Done', due: '2026-08-22' },
      { name: '1+2 score card 요청', status: 'In Progress', due: '2026-09-04' },
      { name: 'Record scoring result', status: 'Not Started', due: '2026-09-08' },
    ],
    activities: [
      { date: '2026-08-26', text: 'Qualification scorecard 보완 요청' },
      { date: '2026-08-22', text: 'Initial meeting 진행' },
    ],
  },
  {
    id: 'datapulse',
    name: 'DataPulse',
    segment: 'Data Governance',
    owner: 'Mina',
    stage: 'NDA',
    stageIndex: 2,
    progress: 42,
    health: 'blocked',
    lastActivity: '2026-09-01',
    nextAction: '법무 검토 담당자 지정',
    dueDate: '2026-09-06',
    blocker: '내부 법무 담당자 미지정',
    tasks: [
      { name: 'Send MZC NDA', status: 'Done', due: '2026-08-28' },
      { name: 'Receive ISV comments', status: 'Done', due: '2026-09-01' },
      { name: 'Review redline & toxic clauses', status: 'Blocked', due: '2026-09-06' },
      { name: 'NDA execution', status: 'Not Started', due: '2026-09-12' },
    ],
    activities: [
      { date: '2026-09-01', text: 'ISV redline 수령' },
      { date: '2026-08-28', text: 'MZC NDA 발송' },
    ],
  },
];

const healthMeta = {
  'on-track': { label: 'On Track', emoji: '🟢' },
  'needs-update': { label: 'Needs Update', emoji: '🟡' },
  stalled: { label: 'Stalled', emoji: '🔴' },
  blocked: { label: 'Blocked', emoji: '⛔' },
};

const stages = ['Intake', 'Qualification Card', 'NDA', 'Partner Agreement', 'GTM Onboarding'];
const STORAGE_KEY = 'isv-partner-ops-v1';
const API_URL = import.meta.env.VITE_ISV_TRACKER_API_URL || '';
const API_URL_STORAGE_KEY = 'isv-partner-ops-api-url';

function getTodayIso() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

function getStoredApiUrl() {
  return localStorage.getItem(API_URL_STORAGE_KEY) || API_URL;
}

function jsonp(apiUrl, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `isvTrackerJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const query = new URLSearchParams({ ...params, jsonp: callbackName });
    let timeout;
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };
    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Google Sheets JSONP request failed'));
    };
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheets response timed out'));
    }, 10000);
    script.src = `${apiUrl}?${query.toString()}`;
    document.body.appendChild(script);
  });
}

function getDaysSince(dateValue) {
  if (!dateValue) return Infinity;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((Date.parse(getTodayIso()) - Date.parse(dateValue)) / dayMs);
}

function derivePartner(partner) {
  const requiredTasks = partner.tasks.filter((task) => task.required !== false);
  const completed = requiredTasks.filter((task) => task.status === 'Done').length;
  const progress = requiredTasks.length ? Math.round((completed / requiredTasks.length) * 100) : 0;
  const hasBlockedTask = partner.tasks.some((task) => task.status === 'Blocked');
  const isOverdue = Boolean(partner.dueDate && partner.dueDate < getTodayIso());
  const daysSinceActivity = getDaysSince(partner.lastActivity);
  let health = 'on-track';
  if (partner.blocker || hasBlockedTask) health = 'blocked';
  else if (isOverdue || daysSinceActivity >= 5) health = 'stalled';
  else if (daysSinceActivity >= 3 || !partner.nextAction) health = 'needs-update';
  return { ...partner, progress, health };
}

function loadPartners() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved).map(derivePartner);
  } catch (error) {
    console.warn('Saved tracker data could not be loaded.', error);
  }
  return initialPartners.map((partner) => ({
    ...partner,
    tasks: partner.tasks.map((task) => ({ ...task, required: task.required !== false })),
  })).map(derivePartner);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isSyncVerified(snapshot, payload) {
  if (!snapshot || snapshot.status !== 'ok') return false;
  const partner = snapshot.partners.find((item) => item.id === payload.partnerId);
  if (!partner) return false;
  if (payload.action === 'updateTaskStatus') {
    return partner.tasks.some((task) => (payload.taskId ? task.id === payload.taskId : task.name === payload.taskName) && task.status === payload.status);
  }
  if (payload.action === 'activity') {
    return partner.activities.some((activity) => activity.date === getTodayIso() && activity.text === payload.summary);
  }
  return true;
}

async function syncApi(payload) {
  const apiUrl = getStoredApiUrl();
  if (!apiUrl) return { ok: false, mode: 'local' };
  try {
    // Cross-origin fetch/form writes can lose the authenticated Apps Script
    // session. JSONP keeps the write on the same authenticated GET path as
    // bootstrap, and bootstrap verification remains the source of truth.
    const response = await jsonp(apiUrl, payload);
    if (!response || response.status !== 'ok') return { ok: false, mode: 'error' };
    // Re-read the canonical Sheet data through JSONP so the UI does not claim
    // that a write succeeded before it is actually visible in the tracker.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await wait(attempt === 0 ? 200 : 500);
      const snapshot = await jsonp(apiUrl, { action: 'bootstrap' });
      if (isSyncVerified(snapshot, payload)) return { ok: true, mode: 'verified' };
    }
    return { ok: false, mode: 'unverified' };
  } catch (error) {
    console.warn('Google Sheets sync failed; local state is preserved.', error);
    return { ok: false, mode: 'error' };
  }
}

function formatDate(value) {
  if (!value) return '미정';
  const [, month, day] = value.split('-');
  return `${month}/${day}`;
}

function healthFromPartner(partner) {
  return healthMeta[partner.health] || healthMeta['needs-update'];
}

function App() {
  const [partners, setPartners] = useState(loadPartners);
  const [selectedId, setSelectedId] = useState(initialPartners[0].id);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ text: '', nextAction: '', dueDate: '', blocker: '' });
  const [activeView, setActiveView] = useState('overview');
  const [apiUrl, setApiUrl] = useState(getStoredApiUrl());
  const [syncMode, setSyncMode] = useState(getStoredApiUrl() ? 'Google Sheets 연결 중' : '로컬 저장 전용');
  const [toast, setToast] = useState('');

  const selectedPartner = partners.find((partner) => partner.id === selectedId) || partners[0];

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
  }, [partners]);

  React.useEffect(() => {
    if (!apiUrl) {
      setSyncMode('로컬 저장 전용');
      return;
    }
    jsonp(apiUrl, { action: 'bootstrap' })
      .then((payload) => {
        if (payload.status !== 'ok') throw new Error(payload.message || 'Google Sheets bootstrap failed');
        setPartners(payload.partners.map(derivePartner));
        setSyncMode('Google Sheets 연결됨');
      })
      .catch((error) => {
        console.warn(error);
        setSyncMode('로컬 저장으로 동작 중');
      });
  }, [apiUrl]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  React.useEffect(() => {
    if (isUpdateOpen) {
      setUpdateForm({
        text: '',
        nextAction: selectedPartner.nextAction || '',
        dueDate: selectedPartner.dueDate || '',
        blocker: selectedPartner.blocker || '',
      });
    }
  }, [isUpdateOpen, selectedId]);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const matchesFilter = filter === 'all' || partner.health === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || `${partner.name} ${partner.stage} ${partner.owner}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, partners, search]);

  const counts = useMemo(() => ({
    active: partners.length,
    needs: partners.filter((partner) => partner.health === 'needs-update').length,
    stalled: partners.filter((partner) => partner.health === 'stalled').length,
    blocked: partners.filter((partner) => partner.health === 'blocked').length,
    dueThisWeek: partners.reduce((total, partner) => total + partner.tasks.filter((task) => {
      if (task.status === 'Done' || !task.due) return false;
      const diff = Math.ceil((Date.parse(task.due) - Date.parse(getTodayIso())) / (24 * 60 * 60 * 1000));
      return diff >= 0 && diff <= 7;
    }).length, 0),
  }), [partners]);

  const handleTaskStatus = (partnerId, taskIndex, status) => {
    const targetPartner = partners.find((partner) => partner.id === partnerId);
    if (!targetPartner) return;
    const task = targetPartner.tasks[taskIndex];
    setPartners((current) => current.map((partner) => {
      if (partner.id !== partnerId) return partner;
      const tasks = partner.tasks.map((task, index) => index === taskIndex ? { ...task, status } : task);
      const activity = { date: getTodayIso(), text: `${partner.tasks[taskIndex].name} 상태를 ${status}(으)로 변경` };
      return derivePartner({ ...partner, tasks, lastActivity: getTodayIso(), activities: [activity, ...partner.activities] });
    }));
    void syncApi({ action: 'updateTaskStatus', partnerId, taskId: task.id, taskName: task.name, status, createdBy: targetPartner.owner }).then((synced) => {
      if (synced.ok) {
        setSyncMode('Google Sheets 연결됨');
        setToast('Google Sheet 저장 및 재조회 확인을 완료했습니다.');
      } else if (synced.mode === 'local') {
        setToast('로컬에 저장했습니다. Settings에서 Google Sheet를 연결하세요.');
      } else {
        setSyncMode('Sheets 재확인 필요');
        setToast('화면에는 반영했지만 Google Sheet 저장 확인이 지연되고 있습니다. 잠시 후 새로고침해 확인하세요.');
      }
    });
  };

  const submitUpdate = (event) => {
    event.preventDefault();
    if (!updateForm.text.trim()) return;
    const syncPayload = {
      action: 'activity',
      partnerId: selectedPartner.id,
      activityType: 'Other',
      summary: updateForm.text.trim(),
      nextAction: updateForm.nextAction.trim(),
      nextActionDue: updateForm.dueDate,
      blocker: updateForm.blocker.trim(),
      createdBy: selectedPartner.owner,
    };
    setPartners((current) => current.map((partner) => partner.id === selectedPartner.id
      ? derivePartner({
        ...partner,
        lastActivity: getTodayIso(),
        nextAction: updateForm.nextAction.trim(),
        dueDate: updateForm.dueDate,
        blocker: updateForm.blocker.trim(),
        activities: [{ date: getTodayIso(), text: updateForm.text.trim() }, ...partner.activities],
      })
      : partner));
    void syncApi(syncPayload).then((synced) => {
      if (synced.ok) {
        setSyncMode('Google Sheets 연결됨');
        setToast('Google Sheet 저장 및 Activity 재조회 확인을 완료했습니다.');
      } else if (synced.mode === 'local') {
        setToast('로컬에 저장했습니다. Settings에서 Google Sheet를 연결하세요.');
      } else {
        setSyncMode('Sheets 재확인 필요');
        setToast('화면에는 반영했지만 Google Sheet 저장 확인이 지연되고 있습니다. 잠시 후 새로고침해 확인하세요.');
      }
    });
    setUpdateForm({ text: '', nextAction: '', dueDate: '', blocker: '' });
    setIsUpdateOpen(false);
  };

  return (
    <div className="tracker-shell">
      <aside className="sidebar">
        <div className="brand-mark">P</div>
        <div className="sidebar-brand">
          <strong>Partner Ops</strong>
          <span>ISV workspace</span>
        </div>
        <nav className="sidebar-nav" aria-label="주 메뉴">
          <button type="button" className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} aria-current={activeView === 'overview' ? 'page' : undefined} onClick={() => setActiveView('overview')}><span>◈</span>Overview</button>
          <button type="button" className={`nav-item ${activeView === 'partners' ? 'active' : ''}`} aria-current={activeView === 'partners' ? 'page' : undefined} onClick={() => setActiveView('partners')}><span>◫</span>Partners</button>
          <button type="button" className={`nav-item ${activeView === 'tasks' ? 'active' : ''}`} aria-current={activeView === 'tasks' ? 'page' : undefined} onClick={() => setActiveView('tasks')}><span>✓</span>Tasks</button>
          <button type="button" className={`nav-item ${activeView === 'activities' ? 'active' : ''}`} aria-current={activeView === 'activities' ? 'page' : undefined} onClick={() => setActiveView('activities')}><span>◌</span>Activities</button>
          <button type="button" className={`nav-item ${activeView === 'weekly' ? 'active' : ''}`} aria-current={activeView === 'weekly' ? 'page' : undefined} onClick={() => setActiveView('weekly')}><span>▤</span>Weekly report</button>
          <button type="button" className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} aria-current={activeView === 'settings' ? 'page' : undefined} onClick={() => setActiveView('settings')}><span>⚙</span>Settings</button>
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">H</span>
          <div><strong>Hazel</strong><small>Owner</small></div>
          <span className="more">•••</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>ISV Partner Ops</strong></div>
          <div className="topbar-actions"><span className="sync-status"><i /> {syncMode}</span><button className="icon-button" title="데이터 연결 상태">?</button><button className="avatar small">H</button></div>
        </header>

        <div className="page-content">
          {activeView !== 'overview' && <ViewHeader activeView={activeView} />}
          {activeView === 'overview' && <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</p>
              <h1>Good morning, Hazel <span>✦</span></h1>
              <p className="heading-copy">오늘은 정체된 업무 {counts.stalled}건과 블로커 {counts.blocked}건을 먼저 확인하세요.</p>
            </div>
            <button className="primary-button" onClick={() => setIsUpdateOpen(true)}><span>＋</span> 빠른 업데이트</button>
          </section>

          <section className="metric-grid" aria-label="요약 지표">
            <MetricCard label="Active partners" value={counts.active} detail="전체 운영 중" tone="navy" icon="◎" />
            <MetricCard label="Needs attention" value={counts.needs + counts.stalled} detail="오늘 확인 필요" tone="yellow" icon="◒" />
            <MetricCard label="Blocked" value={counts.blocked} detail="지원 필요" tone="red" icon="!" />
            <MetricCard label="Due this week" value={counts.dueThisWeek} detail="마감 예정 업무" tone="green" icon="✓" />
          </section>

          <section className="workspace-grid">
            <div className="main-column">
              <div className="section-heading">
                <div><h2>Attention required</h2><p>예외 상태를 먼저 처리하세요.</p></div>
                <button className="text-button" onClick={() => setActiveView('partners')}>View all <span>→</span></button>
              </div>
              <div className="filter-row">
                {[
                  ['all', 'All partners'],
                  ['needs-update', '🟡 Needs update'],
                  ['stalled', '🔴 Stalled'],
                  ['blocked', '⛔ Blocked'],
                ].map(([value, label]) => <button key={value} className={`filter-pill ${filter === value ? 'selected' : ''}`} onClick={() => setFilter(value)}>{label}</button>)}
                <div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="파트너 검색" /></div>
              </div>

              <div className="partner-list">
                {filteredPartners.map((partner) => <PartnerRow key={partner.id} partner={partner} selected={partner.id === selectedId} onClick={() => setSelectedId(partner.id)} />)}
                {filteredPartners.length === 0 && <div className="empty-state">조건에 맞는 파트너가 없습니다.</div>}
              </div>

              <div className="section-heading stage-heading"><div><h2>Pipeline by stage</h2><p>현재 파트너가 어느 단계에 모여 있는지 확인합니다.</p></div></div>
              <div className="pipeline-card">
                {stages.map((stage, index) => {
                  const total = partners.filter((partner) => partner.stageIndex === index + 1).length;
                  return <div className="pipeline-stage" key={stage}><div className={`pipeline-dot ${total ? 'filled' : ''}`}>{total || ''}</div><span>{stage}</span><strong>{total}</strong>{index < stages.length - 1 && <i />}</div>;
                })}
              </div>
            </div>

            <PartnerDetail partner={selectedPartner} onTaskStatus={(taskIndex, status) => handleTaskStatus(selectedPartner.id, taskIndex, status)} onUpdate={() => setIsUpdateOpen(true)} />
          </section>
          </>}
          {activeView === 'partners' && <PartnersView partners={filteredPartners} selectedId={selectedId} onSelect={(partnerId) => { setSelectedId(partnerId); setActiveView('overview'); }} />}
          {activeView === 'tasks' && <TasksView partners={partners} onTaskStatus={handleTaskStatus} />}
          {activeView === 'activities' && <ActivitiesView partners={partners} />}
          {activeView === 'weekly' && <WeeklyReportView partners={partners} setToast={setToast} />}
          {activeView === 'settings' && <SettingsView apiUrl={apiUrl} setApiUrl={setApiUrl} setSyncMode={setSyncMode} setToast={setToast} />}
        </div>
      </main>

      {isUpdateOpen && <div className="modal-backdrop" onMouseDown={() => setIsUpdateOpen(false)}>
        <form className="update-modal" onSubmit={submitUpdate} onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><p className="eyebrow">Quick update</p><h2>{selectedPartner.name}</h2></div><button type="button" className="close-button" onClick={() => setIsUpdateOpen(false)}>×</button></div>
          <label>오늘 변경된 내용<textarea autoFocus value={updateForm.text} onChange={(event) => setUpdateForm({ ...updateForm, text: event.target.value })} placeholder="회의, 이메일, 통화 결과를 짧게 입력하세요." /></label>
          <div className="form-grid">
            <label>다음 액션<input value={updateForm.nextAction} onChange={(event) => setUpdateForm({ ...updateForm, nextAction: event.target.value })} placeholder="예: PR 초안 피드백 확인" /></label>
            <label>기한<input type="date" value={updateForm.dueDate} onChange={(event) => setUpdateForm({ ...updateForm, dueDate: event.target.value })} /></label>
          </div>
          <label><span className="label-with-action">블로커 / 외부 대기 {updateForm.blocker && <button type="button" className="clear-blocker" onClick={() => setUpdateForm({ ...updateForm, blocker: '' })}>블로커 해소</button>}</span><textarea className="compact-textarea" value={updateForm.blocker} onChange={(event) => setUpdateForm({ ...updateForm, blocker: event.target.value })} placeholder="없으면 비워두세요." /></label>
          <p className="ai-hint">✦ 저장 위치: Activities 기록 + Partners의 Last Activity / Next Action / Due Date / Blocker 갱신. Blocker를 입력하면 Health가 ⛔ Blocked가 되고, 해소되었으면 비워두세요.</p>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setIsUpdateOpen(false)}>취소</button><button type="submit" className="primary-button">업데이트 기록</button></div>
        </form>
      </div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function MetricCard({ label, value, detail, tone, icon }) {
  return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div></div>;
}

function ViewHeader({ activeView }) {
  const labels = {
    partners: ['Partners', 'ISV별 현재 단계와 Health를 관리합니다.'],
    tasks: ['Tasks', '담당 업무와 Status를 업데이트합니다.'],
    activities: ['Activities', '실제 업무 변화와 다음 액션을 기록합니다.'],
    weekly: ['Weekly report', '이번 주에 기록된 변화와 현재 조치 필요 항목을 보고용으로 정리합니다.'],
    settings: ['Settings', 'Google Sheets 연결과 운영 설정을 관리합니다.'],
  };
  const [title, description] = labels[activeView] || labels.partners;
  return <section className="page-heading compact-heading"><div><p className="eyebrow">ISV Partner Ops</p><h1>{title}</h1><p className="heading-copy">{description}</p></div></section>;
}

function getWeekRange() {
  const today = new Date(`${getTodayIso()}T00:00:00`);
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { start: toIso(monday), end: toIso(today) };
}

function buildWeeklyReport(partners) {
  const { start, end } = getWeekRange();
  const weeklyActivities = partners.flatMap((partner) => partner.activities
    .filter((activity) => activity.date >= start && activity.date <= end)
    .map((activity) => ({ ...activity, partnerName: partner.name })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.partnerName.localeCompare(b.partnerName));
  const attention = partners.filter((partner) => ['blocked', 'stalled', 'needs-update'].includes(partner.health));
  const lines = [`ISV 파트너십 주간 보고 (${formatDate(start)}–${formatDate(end)})`, '', '이번 주 주요 진행'];
  if (weeklyActivities.length) weeklyActivities.forEach((activity) => lines.push(`- ${activity.partnerName}: ${activity.text}`));
  else lines.push('- 이번 주 등록된 활동이 없습니다.');
  lines.push('', '현재 정체·블로커 및 다음 액션');
  if (attention.length) attention.forEach((partner) => {
    const status = healthMeta[partner.health]?.label || partner.health;
    lines.push(`- ${partner.name} (${status}, ${partner.stage}): ${partner.blocker ? `블로커 ${partner.blocker}; ` : ''}다음 액션 ${partner.nextAction || '미정'} / 담당 ${partner.owner || '미정'} / 기한 ${formatDate(partner.dueDate)}`);
  });
  else lines.push('- 현재 확인이 필요한 파트너가 없습니다.');
  return { start, end, weeklyActivities, attention, text: lines.join('\n') };
}

function WeeklyReportView({ partners, setToast }) {
  const report = useMemo(() => buildWeeklyReport(partners), [partners]);
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report.text);
      setToast('주간 보고 내용을 클립보드에 복사했습니다.');
    } catch (error) {
      setToast('복사할 수 없습니다. 브라우저의 클립보드 권한을 확인하세요.');
    }
  };
  return <section className="subview-card">
    <div className="subview-toolbar"><div><h2>주간 보고 초안</h2><p>{formatDate(report.start)}–{formatDate(report.end)} · 이번 주 누적 Activity와 현재 Health 기준</p></div><button className="primary-button" onClick={copyReport}>보고 내용 복사</button></div>
    <div className="weekly-report"><pre>{report.text}</pre></div>
    <p className="report-footnote">보고 초안은 저장된 Activity와 현재 파트너 상태를 그대로 요약합니다. 사실 확인 후 공유하세요.</p>
  </section>;
}

function PartnersView({ partners, selectedId, onSelect }) {
  return <section className="subview-card"><div className="subview-toolbar"><div><h2>All partners</h2><p>파트너를 선택하면 Overview의 상세 패널로 이동합니다.</p></div><span className="result-count">{partners.length} partners</span></div><div className="partner-list">{partners.map((partner) => <PartnerRow key={partner.id} partner={partner} selected={partner.id === selectedId} onClick={() => onSelect(partner.id)} />)}</div></section>;
}

function TasksView({ partners, onTaskStatus }) {
  const rows = partners.flatMap((partner) => partner.tasks.map((task, taskIndex) => ({ partner, task, taskIndex })));
  return <section className="subview-card"><div className="subview-toolbar"><div><h2>Task queue</h2><p>Status를 바꾸면 Progress와 Health가 함께 계산됩니다.</p></div><span className="result-count">{rows.length} tasks</span></div><div className="task-table"><div className="task-table-row task-table-header"><span>Partner</span><span>Stage</span><span>Task</span><span>Status</span><span>Due</span></div>{rows.map(({ partner, task, taskIndex }) => <div className="task-table-row" key={`${partner.id}-${task.name}`}><span className="table-partner">{partner.name}</span><span>{partner.stage}</span><strong>{task.name}</strong><select className={`task-status ${task.status.toLowerCase().replaceAll(' ', '-')}`} value={task.status} onChange={(event) => onTaskStatus(partner.id, taskIndex, event.target.value)}><option>Not Started</option><option>In Progress</option><option>Waiting External</option><option>Blocked</option><option>Done</option><option>Deferred</option></select><span>{formatDate(task.due)}</span></div>)}</div></section>;
}

function ActivitiesView({ partners }) {
  const activities = partners.flatMap((partner) => partner.activities.map((activity) => ({ ...activity, partnerName: partner.name, stage: partner.stage }))).sort((a, b) => b.date.localeCompare(a.date));
  return <section className="subview-card"><div className="subview-toolbar"><div><h2>Activity log</h2><p>Quick Update와 Task 상태 변경 내역이 쌓입니다.</p></div><span className="result-count">{activities.length} activities</span></div><div className="activity-feed">{activities.map((activity, index) => <div className="feed-row" key={`${activity.partnerName}-${activity.date}-${activity.text}-${index}`}><span className="activity-dot" /><div><div className="feed-meta"><strong>{activity.partnerName}</strong><span>{formatDate(activity.date)} · {activity.stage}</span></div><p>{activity.text}</p></div></div>)}</div></section>;
}

function SettingsView({ apiUrl, setApiUrl, setSyncMode, setToast }) {
  const [draftUrl, setDraftUrl] = useState(apiUrl);
  const [testing, setTesting] = useState(false);

  const saveAndTest = async (event) => {
    event.preventDefault();
    const nextUrl = draftUrl.trim();
    setTesting(true);
    if (!nextUrl) {
      localStorage.removeItem(API_URL_STORAGE_KEY);
      setApiUrl('');
      setSyncMode('로컬 저장 전용');
      setToast('로컬 저장 모드로 전환했습니다.');
      setTesting(false);
      return;
    }
    try {
      const payload = await jsonp(nextUrl, { action: 'health' });
      if (payload.status !== 'ok') throw new Error(payload.message || 'API health check failed');
      localStorage.setItem(API_URL_STORAGE_KEY, nextUrl);
      setApiUrl(nextUrl);
      setSyncMode('Google Sheets 연결됨');
      setToast('Google Sheets 연결을 확인했습니다.');
    } catch (error) {
      setSyncMode('로컬 저장으로 동작 중');
      setToast(`연결 실패: ${error.message}. URL과 Apps Script 배포 권한을 확인하세요.`);
    } finally {
      setTesting(false);
    }
  };

  return <section className="settings-grid"><div className="subview-card settings-card"><div className="subview-toolbar"><div><h2>Google Sheets connection</h2><p>Apps Script Web App URL을 저장하면 Update가 Sheet에 기록됩니다.</p></div><span className={`connection-badge ${apiUrl ? 'connected' : 'local'}`}>{apiUrl ? 'Configured' : 'Local only'}</span></div><form onSubmit={saveAndTest} className="settings-form"><label>Apps Script Web App URL<input value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /></label><div className="settings-actions"><button className="primary-button" type="submit" disabled={testing}>{testing ? '연결 확인 중…' : '저장하고 연결 테스트'}</button><button className="secondary-button" type="button" onClick={() => { localStorage.removeItem(API_URL_STORAGE_KEY); setDraftUrl(''); setApiUrl(''); setSyncMode('로컬 저장 전용'); setToast('로컬 저장 모드로 전환했습니다.'); }}>로컬 모드</button></div></form><div className="settings-note"><strong>Update 저장 위치</strong><p>Quick Update → <b>Activities</b>에 기록하고, <b>Partners</b>의 Last Activity / Next Action / Due Date / Blocker를 갱신합니다. Task Status 변경은 <b>Tasks</b>에 반영하고 <b>Activities</b>에도 이력을 남깁니다.</p></div></div><div className="subview-card settings-card"><h2>운영 규칙</h2><div className="rule-list"><p>🟢 2일 이내 실제 활동이 있으면 정상</p><p>🟡 3일 이상 활동이 없으면 확인 필요</p><p>🔴 5일 이상 정체 또는 기한 초과</p><p>⛔ Blocker 입력 또는 Task가 Blocked면 차단</p><p>모든 Active Partner는 Next Action과 Due Date를 유지</p></div><div className="guide-links"><a className="guide-link" href="./ISV_TRACKER_설치_가이드.md">설치 가이드 보기 →</a><a className="guide-link" href="./ISV_TRACKER_온보딩_가이드.md">사용자 온보딩 보기 →</a></div></div></section>;
}

function PartnerRow({ partner, selected, onClick }) {
  const health = healthFromPartner(partner);
  return <button className={`partner-row ${selected ? 'selected' : ''}`} onClick={onClick}>
    <div className="partner-identity"><span className="partner-logo">{partner.name.slice(0, 1)}</span><div><strong>{partner.name}</strong><small>{partner.segment}</small></div></div>
    <div className="stage-cell"><span>{partner.stage}</span><small>{partner.progress}% complete</small><div className="progress-track"><i style={{ width: `${partner.progress}%` }} /></div></div>
    <div className="health-cell"><span className={`health-badge ${partner.health}`}>{health.emoji} {health.label}</span><small>Last activity {formatDate(partner.lastActivity)}</small></div>
    <div className="next-action-cell"><strong>{partner.nextAction}</strong><small><span>Due {formatDate(partner.dueDate)}</span> · {partner.owner}</small></div>
    <span className="row-arrow">→</span>
  </button>;
}

function PartnerDetail({ partner, onTaskStatus, onUpdate }) {
  const health = healthFromPartner(partner);
  return <aside className="detail-panel">
    <div className="detail-header"><div className="detail-title"><span className="large-logo">{partner.name.slice(0, 1)}</span><div><h2>{partner.name}</h2><p>{partner.segment}</p></div></div><button className="more-button">•••</button></div>
    <div className="detail-status-line"><span className={`health-badge ${partner.health}`}>{health.emoji} {health.label}</span><span>Owner <strong>{partner.owner}</strong></span></div>
    <div className="detail-progress"><div><span>Current stage</span><strong>{partner.stage}</strong></div><b>{partner.progress}%</b></div><div className="progress-track large"><i style={{ width: `${partner.progress}%` }} /></div>
    <div className="next-action-box"><div><span className="action-label">NEXT ACTION</span><strong>{partner.nextAction}</strong><small>Due {formatDate(partner.dueDate)}</small></div><button onClick={onUpdate}>빠른 업데이트</button></div>
    <div className="detail-section"><div className="detail-section-heading"><h3>Stage tasks</h3><span>{partner.tasks.filter((task) => task.status === 'Done').length}/{partner.tasks.length} done</span></div><div className="task-list">{partner.tasks.map((task, index) => <div className="task-item" key={`${task.name}-${index}`}><select value={task.status} onChange={(event) => onTaskStatus(index, event.target.value)} className={`task-status ${task.status.toLowerCase().replaceAll(' ', '-')}`}><option>Not Started</option><option>In Progress</option><option>Waiting External</option><option>Blocked</option><option>Done</option><option>Deferred</option></select><div><strong>{task.name}</strong><small>Due {formatDate(task.due)}</small></div></div>)}</div></div>
    {partner.blocker && <div className="blocker-box"><span>⛔</span><div><strong>Blocker</strong><p>{partner.blocker}</p></div></div>}
    <div className="detail-section activity-section"><div className="detail-section-heading"><h3>Recent activity</h3><button className="text-button" onClick={onUpdate}>+ Add</button></div>{partner.activities.slice(0, 3).map((activity) => <div className="activity-item" key={`${activity.date}-${activity.text}`}><span className="activity-dot" /><div><small>{formatDate(activity.date)}</small><p>{activity.text}</p></div></div>)}</div>
  </aside>;
}

createRoot(document.getElementById('root')).render(<App />);
