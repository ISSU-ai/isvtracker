/**
 * ISV Partnership Tracker - Google Apps Script API
 *
 * 사용 대상 Sheet:
 * https://docs.google.com/spreadsheets/d/1Om2IxNZLlsyWnrry9U-ysAJlv-oE2uJSSSwNMg_ph7k/edit
 *
 * 웹앱 배포 후 프론트엔드 환경변수에 다음 값을 넣습니다.
 * VITE_ISV_TRACKER_API_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
 */

const ISV_TRACKER_SHEET_ID = '1Om2IxNZLlsyWnrry9U-ysAJlv-oE2uJSSSwNMg_ph7k';
const ISV_TRACKER_TABS = {
  partners: 'Partners',
  tasks: 'Tasks',
  activities: 'Activities',
};

// 웹앱에 접근할 수 있는 계정. 이메일은 소문자로 비교합니다.
const ISV_TRACKER_ALLOWED_USERS = [
  'wonzero@mz.co.kr',
  'heeyeon.k@mz.co.kr',
];

function activeUserEmail_() {
  return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function isAllowedUser_() {
  return ISV_TRACKER_ALLOWED_USERS.indexOf(activeUserEmail_()) >= 0;
}

function denied_(e) {
  return output_({
    status: 'forbidden',
    message: '이 트래커는 지정된 사용자만 사용할 수 있습니다.',
  }, e);
}

function doGet(e) {
  if (!isAllowedUser_()) return denied_(e);
  try {
    const action = (e && e.parameter && e.parameter.action) || 'health';
    let payload;
    if (action === 'bootstrap') payload = bootstrap_();
    else if (action === 'createPartner') payload = withLock_(() => createPartner_(e.parameter || {}));
    else if (action === 'activity') payload = withLock_(() => appendActivity_(e.parameter || {}));
    else if (action === 'updateTaskStatus') payload = withLock_(() => updateTaskStatus_(e.parameter || {}));
    else if (action === 'updateTaskDetails') payload = withLock_(() => updateTaskDetails_(e.parameter || {}));
    else payload = { status: 'ok', service: 'isv-partner-ops', sheetId: ISV_TRACKER_SHEET_ID };
    return output_(payload, e);
  } catch (error) {
    return output_({ status: 'error', message: error.message }, e);
  }
}

function doPost(e) {
  if (!isAllowedUser_()) {
    return json_({ status: 'forbidden', message: '이 트래커는 지정된 사용자만 사용할 수 있습니다.' });
  }
  try {
    const rawPayload = (e && e.postData && e.postData.contents)
      || (e && e.parameter && e.parameter.payload)
      || '{}';
    const payload = JSON.parse(rawPayload);
    return json_(withLock_(() => {
      if (payload.action === 'activity') return appendActivity_(payload);
      if (payload.action === 'createPartner') return createPartner_(payload);
      if (payload.action === 'updateTaskStatus') return updateTaskStatus_(payload);
      if (payload.action === 'updateTaskDetails') return updateTaskDetails_(payload);
      return { status: 'error', message: 'Unknown action' };
    }));
  } catch (error) {
    return json_({ status: 'error', message: error.message });
  }
}

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function bootstrap_() {
  const ss = SpreadsheetApp.openById(ISV_TRACKER_SHEET_ID);
  const partners = readRows_(ss.getSheetByName(ISV_TRACKER_TABS.partners));
  const tasks = readRows_(ss.getSheetByName(ISV_TRACKER_TABS.tasks));
  const activities = readRows_(ss.getSheetByName(ISV_TRACKER_TABS.activities));
  const stageTemplates = readRows_(ss.getSheetByName('Stage_Template'));
  const stageIndex = { Intake: 1, 'Qualification Card': 2, NDA: 3, 'Partner Agreement': 4, 'GTM Onboarding': 5 };

  const taskByPartner = groupBy_(tasks, 'Partner ID');
  const activityByPartner = groupBy_(activities, 'Partner ID');
  const result = partners.filter((row) => row['ISV Name']).map((row) => {
    const partnerTasks = (taskByPartner[row['Partner ID']] || []).map((task) => ({
      id: task['Task ID'],
      name: task['Task Name'],
      required: task.Required === 'Y',
      status: task.Status || 'Not Started',
      due: toIso_(task['Due Date']),
      lastUpdated: toIso_(task['Last Updated']),
      owner: task.Owner || '',
      nextAction: task['Next Action'] || '',
      blocker: task.Blocker || '',
      waitingOn: task['Waiting On'] || '',
      notes: task.Notes || '',
      referenceLink: task['Reference Link'] || '',
    }));
    const partnerActivities = (activityByPartner[row['Partner ID']] || []).sort((a, b) => String(b.Date).localeCompare(String(a.Date))).map((activity) => ({
      date: toIso_(activity.Date),
      text: activity.Summary || activity.Decision || '',
    }));
    const lastActivity = toIso_(row['Last Activity']) || partnerActivities[0]?.date || '';
    const blocker = row.Blocker || partnerTasks.find((task) => task.status === 'Blocked')?.name || '';
    return {
      id: String(row['Partner ID']),
      name: row['ISV Name'],
      segment: row['Segment / Focus'] || '',
      owner: row.Owner || '',
      stage: row['Current Stage'] || 'Intake',
      stageIndex: stageIndex[row['Current Stage']] || 1,
      lastActivity,
      nextAction: row['Next Action'] || partnerActivities[0]?.text || '',
      dueDate: toIso_(row['Next Action Due']),
      blocker,
      tasks: partnerTasks,
      activities: partnerActivities,
    };
  });
  const stageTaskCounts = stageTemplates.reduce((counts, row) => {
    const stage = String(row.Stage || '').trim();
    if (stage) counts[stage] = (counts[stage] || 0) + 1;
    return counts;
  }, {});
  return { status: 'ok', partners: result, stageTaskCounts, generatedAt: new Date().toISOString() };
}

function createPartner_(payload) {
  const name = String(payload.name || '').trim();
  const owner = String(payload.owner || '').trim();
  const stage = String(payload.stage || 'Intake').trim();
  const nextAction = String(payload.nextAction || '').trim();
  const nextActionDue = String(payload.nextActionDue || '').trim();
  const stages = ['Intake', 'Qualification Card', 'NDA', 'Partner Agreement', 'GTM Onboarding'];
  if (!name || !owner || !nextAction || !nextActionDue) throw new Error('ISV명, Owner, Next Action, 기한은 필수입니다.');
  if (stages.indexOf(stage) < 0) throw new Error('지원하지 않는 Stage입니다.');

  const ss = SpreadsheetApp.openById(ISV_TRACKER_SHEET_ID);
  const partnersSheet = ss.getSheetByName(ISV_TRACKER_TABS.partners);
  const existing = readRows_(partnersSheet);
  if (existing.some((row) => String(row['ISV Name'] || '').trim().toLowerCase() === name.toLowerCase())) {
    throw new Error('같은 이름의 ISV가 이미 등록되어 있습니다.');
  }
  const partnerId = nextPartnerId_(existing);
  const now = new Date();
  const partnerHeaders = headerMap_(partnersSheet);
  const partnerRow = Array(partnersSheet.getLastColumn()).fill('');
  setCell_(partnerRow, partnerHeaders, 'Partner ID', partnerId);
  setCell_(partnerRow, partnerHeaders, 'ISV Name', name);
  setCell_(partnerRow, partnerHeaders, 'Segment / Focus', String(payload.segment || '').trim());
  setCell_(partnerRow, partnerHeaders, 'Location', String(payload.location || '').trim());
  setCell_(partnerRow, partnerHeaders, 'Owner', owner);
  setCell_(partnerRow, partnerHeaders, 'ISV Contact', String(payload.contact || '').trim());
  setCell_(partnerRow, partnerHeaders, 'Lead Source', String(payload.leadSource || '').trim());
  setCell_(partnerRow, partnerHeaders, 'Current Stage', stage);
  setCell_(partnerRow, partnerHeaders, 'Overall Status', 'Active');
  setCell_(partnerRow, partnerHeaders, 'Last Activity', now);
  setCell_(partnerRow, partnerHeaders, 'Next Action', nextAction);
  setCell_(partnerRow, partnerHeaders, 'Next Action Due', parseDate_(nextActionDue));
  setCell_(partnerRow, partnerHeaders, 'Blocker', String(payload.blocker || '').trim());
  const partnerRowNumber = appendRowWithTemplate_(partnersSheet, partnerRow, 2);
  [9, 10, 12].forEach((column) => {
    partnersSheet.getRange(2, column).copyTo(
      partnersSheet.getRange(partnerRowNumber, column),
      SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
      false,
    );
  });

  const taskCount = createStageTasks_(ss, partnerId, stage, owner, now);
  appendRegistrationActivity_(ss, partnerId, payload, now);
  updatePartnerLastActivity_(ss, partnerId, now);
  return { status: 'ok', action: 'createPartner', partnerId, taskCount };
}

function nextPartnerId_(partners) {
  const highest = partners.reduce((max, row) => {
    const match = String(row['Partner ID'] || '').match(/^P(\d+)(?:-|$)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return 'P' + (highest + 1);
}

function createStageTasks_(ss, partnerId, stage, owner, createdAt) {
  const templateRows = readRows_(ss.getSheetByName('Stage_Template'))
    .filter((row) => String(row.Stage || '').trim() === stage);
  const tasksSheet = ss.getSheetByName(ISV_TRACKER_TABS.tasks);
  const headers = headerMap_(tasksSheet);
  const stageCode = { Intake: 'INT', 'Qualification Card': 'QUAL', NDA: 'NDA', 'Partner Agreement': 'AGR', 'GTM Onboarding': 'GTM' }[stage];
  templateRows.forEach((template) => {
    const taskNo = String(template['Task No'] || '').trim();
    const slaDays = Number(template['Default SLA Days']) || 0;
    const due = new Date(createdAt);
    due.setDate(due.getDate() + slaDays);
    const row = Array(tasksSheet.getLastColumn()).fill('');
    setCell_(row, headers, 'Task ID', `${partnerId}-${stageCode}-${taskNo.padStart(2, '0')}`);
    setCell_(row, headers, 'Partner ID', partnerId);
    setCell_(row, headers, 'Stage', stage);
    setCell_(row, headers, 'Task No', taskNo);
    setCell_(row, headers, 'Task Name', template['Task Name'] || '');
    setCell_(row, headers, 'Required', template.Required === 'Y' ? 'Y' : 'N');
    setCell_(row, headers, 'Owner', owner);
    setCell_(row, headers, 'Status', 'Not Started');
    setCell_(row, headers, 'Due Date', due);
    setCell_(row, headers, 'Last Updated', createdAt);
    setCell_(row, headers, 'Notes', template.Notes || '');
    appendRowWithTemplate_(tasksSheet, row, 2);
  });
  return templateRows.length;
}

function appendRegistrationActivity_(ss, partnerId, payload, date) {
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.activities);
  const headers = headerMap_(sheet);
  const row = Array(sheet.getLastColumn()).fill('');
  setCell_(row, headers, 'Activity ID', 'ACT-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  setCell_(row, headers, 'Partner ID', partnerId);
  setCell_(row, headers, 'Date', date);
  setCell_(row, headers, 'Activity Type', 'Other');
  setCell_(row, headers, 'Summary', String(payload.registrationNote || '').trim() || '웹 입력 화면에서 파트너 등록');
  setCell_(row, headers, 'Next Action', String(payload.nextAction || '').trim());
  setCell_(row, headers, 'Next Action Owner', String(payload.owner || '').trim());
  setCell_(row, headers, 'Next Action Due', parseDate_(payload.nextActionDue));
  setCell_(row, headers, 'Blocker', String(payload.blocker || '').trim());
  setCell_(row, headers, 'Created By', String(payload.owner || '').trim());
  appendRowWithTemplate_(sheet, row, 2);
}

function appendRowWithTemplate_(sheet, row, templateRow) {
  sheet.appendRow(row);
  const rowNumber = sheet.getLastRow();
  const width = sheet.getLastColumn();
  const template = sheet.getRange(templateRow, 1, 1, width);
  const target = sheet.getRange(rowNumber, 1, 1, width);
  template.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  template.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  return rowNumber;
}

function parseDate_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('날짜는 YYYY-MM-DD 형식이어야 합니다.');
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function appendActivity_(payload) {
  const ss = SpreadsheetApp.openById(ISV_TRACKER_SHEET_ID);
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.activities);
  const headers = headerMap_(sheet);
  const activityId = 'ACT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const now = new Date();
  const row = Array(sheet.getLastColumn()).fill('');
  setCell_(row, headers, 'Activity ID', activityId);
  setCell_(row, headers, 'Partner ID', payload.partnerId || '');
  setCell_(row, headers, 'Date', now);
  setCell_(row, headers, 'Activity Type', payload.activityType || 'Other');
  setCell_(row, headers, 'Summary', payload.summary || '');
  setCell_(row, headers, 'Decision', payload.decision || '');
  setCell_(row, headers, 'Next Action', payload.nextAction || '');
  setCell_(row, headers, 'Next Action Owner', payload.nextActionOwner || '');
  setCell_(row, headers, 'Next Action Due', payload.nextActionDue ? new Date(payload.nextActionDue) : '');
  setCell_(row, headers, 'Blocker', payload.blocker || '');
  setCell_(row, headers, 'Source Link', payload.sourceLink || '');
  setCell_(row, headers, 'Created By', payload.createdBy || '');
  sheet.appendRow(row);
  updatePartnerSummary_(ss, payload.partnerId, { lastActivity: now, nextAction: payload.nextAction || '', nextActionDue: payload.nextActionDue || '', blocker: payload.blocker || '' });
  return { status: 'ok', action: 'activity', activityId };
}

function updateTaskStatus_(payload) {
  const ss = SpreadsheetApp.openById(ISV_TRACKER_SHEET_ID);
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.tasks);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const partnerIndex = headers.indexOf('Partner ID');
  const taskIdIndex = headers.indexOf('Task ID');
  const taskNameIndex = headers.indexOf('Task Name');
  const statusIndex = headers.indexOf('Status');
  const updatedIndex = headers.indexOf('Last Updated');
  const rowIndex = values.findIndex((row) => String(row[partnerIndex]) === String(payload.partnerId)
    && (payload.taskId && taskIdIndex >= 0
      ? String(row[taskIdIndex]) === String(payload.taskId)
      : String(row[taskNameIndex]) === String(payload.taskName)));
  if (rowIndex < 0) throw new Error('Task not found');
  const sheetRow = rowIndex + 2;
  sheet.getRange(sheetRow, statusIndex + 1).setValue(payload.status || 'Not Started');
  if (updatedIndex >= 0) sheet.getRange(sheetRow, updatedIndex + 1).setValue(new Date());
  appendTaskStatusActivity_(ss, payload, values[rowIndex][taskNameIndex]);
  return { status: 'ok', action: 'updateTaskStatus', taskName: payload.taskName };
}

function updateTaskDetails_(payload) {
  const progressNote = String(payload.progressNote || '').trim();
  if (!progressNote) throw new Error('진행 내용은 필수입니다.');
  const ss = SpreadsheetApp.openById(ISV_TRACKER_SHEET_ID);
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.tasks);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const partnerIndex = headers.indexOf('Partner ID');
  const taskIdIndex = headers.indexOf('Task ID');
  const rowIndex = values.findIndex((row) => String(row[partnerIndex]) === String(payload.partnerId)
    && String(row[taskIdIndex]) === String(payload.taskId));
  if (rowIndex < 0) throw new Error('Task not found');
  const rowNumber = rowIndex + 2;
  const read = (name) => headers.indexOf(name);
  const write = (name, value) => {
    const index = read(name);
    if (index >= 0) sheet.getRange(rowNumber, index + 1).setValue(value);
  };
  const now = new Date();
  write('Status', String(payload.status || 'Not Started'));
  write('Due Date', parseDate_(payload.dueDate));
  write('Last Updated', now);
  write('Next Action', String(payload.nextAction || '').trim());
  write('Waiting On', String(payload.waitingOn || '').trim());
  write('Blocker', String(payload.blocker || '').trim());
  write('Notes', progressNote);
  write('Reference Link', String(payload.referenceLink || '').trim());
  const taskName = values[rowIndex][headers.indexOf('Task Name')];
  appendTaskStatusActivity_(ss, {
    ...payload,
    activitySummary: `[${taskName}] ${progressNote}${payload.nextAction ? ' · 다음 액션: ' + String(payload.nextAction).trim() : ''}`,
  }, taskName, now);
  updatePartnerTaskBlocker_(ss, payload.partnerId, values[rowIndex][headers.indexOf('Blocker')], String(payload.blocker || '').trim());
  return { status: 'ok', action: 'updateTaskDetails', taskId: payload.taskId };
}

function appendTaskStatusActivity_(ss, payload, taskName, date) {
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.activities);
  const headers = headerMap_(sheet);
  const row = Array(sheet.getLastColumn()).fill('');
  setCell_(row, headers, 'Activity ID', 'ACT-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  setCell_(row, headers, 'Partner ID', payload.partnerId || '');
  setCell_(row, headers, 'Date', date || new Date());
  // The template validation list permits Email, Meeting, Call, Portal, Internal, Other.
  setCell_(row, headers, 'Activity Type', 'Other');
  setCell_(row, headers, 'Summary', payload.activitySummary || ('[' + (taskName || payload.taskName) + '] 상태를 ' + (payload.status || 'Not Started') + '(으)로 변경'));
  setCell_(row, headers, 'Next Action', String(payload.nextAction || '').trim());
  setCell_(row, headers, 'Next Action Owner', String(payload.createdBy || '').trim());
  if (payload.dueDate) setCell_(row, headers, 'Next Action Due', parseDate_(payload.dueDate));
  setCell_(row, headers, 'Created By', payload.createdBy || '');
  appendRowWithTemplate_(sheet, row, 2);
  updatePartnerLastActivity_(ss, payload.partnerId, date || new Date());
}

function updatePartnerLastActivity_(ss, partnerId, date) {
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.partners);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const idIndex = headers.indexOf('Partner ID');
  const lastActivityIndex = headers.indexOf('Last Activity');
  const rowIndex = values.findIndex((row) => String(row[idIndex]) === String(partnerId));
  if (rowIndex >= 0 && lastActivityIndex >= 0) sheet.getRange(rowIndex + 2, lastActivityIndex + 1).setValue(date || new Date());
}

function updatePartnerTaskBlocker_(ss, partnerId, previousTaskBlocker, nextTaskBlocker) {
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.partners);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const idIndex = headers.indexOf('Partner ID');
  const blockerIndex = headers.indexOf('Blocker');
  const rowIndex = values.findIndex((row) => String(row[idIndex]) === String(partnerId));
  if (rowIndex < 0 || blockerIndex < 0) return;
  const cell = sheet.getRange(rowIndex + 2, blockerIndex + 1);
  const current = String(values[rowIndex][blockerIndex] || '').trim();
  if (nextTaskBlocker) cell.setValue(nextTaskBlocker);
  else if (previousTaskBlocker && current === String(previousTaskBlocker).trim()) cell.clearContent();
}

function updatePartnerSummary_(ss, partnerId, update) {
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.partners);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const idIndex = headers.indexOf('Partner ID');
  const rowIndex = values.findIndex((row) => String(row[idIndex]) === String(partnerId));
  if (rowIndex < 0) return;
  const row = rowIndex + 2;
  writeByHeader_(sheet, headers, row, 'Last Activity', update.lastActivity);
  writeByHeader_(sheet, headers, row, 'Next Action', update.nextAction);
  writeByHeader_(sheet, headers, row, 'Next Action Due', update.nextActionDue ? new Date(update.nextActionDue) : '');
  writeByHeader_(sheet, headers, row, 'Blocker', update.blocker);
}

function readRows_(sheet) {
  if (!sheet) throw new Error('Required sheet tab is missing');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values.shift();
  return values.filter((row) => row.some((cell) => cell !== '')).map((row) => headers.reduce((result, header, index) => { result[header] = row[index]; return result; }, {}));
}

function headerMap_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].reduce((result, header, index) => { result[header] = index; return result; }, {});
}

function setCell_(row, headers, name, value) {
  const index = headers[name];
  if (index !== undefined) row[index] = value;
}

function writeByHeader_(sheet, headers, row, name, value) {
  const index = headers.indexOf(name);
  if (index >= 0) sheet.getRange(row, index + 1).setValue(value);
}

function groupBy_(rows, key) {
  return rows.reduce((result, row) => {
    const value = String(row[key] || '');
    if (!result[value]) result[value] = [];
    result[value].push(row);
    return result;
  }, {});
}

function toIso_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function output_(payload, e) {
  const callback = e && e.parameter && (e.parameter.jsonp || e.parameter.callback);
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + serialized + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(payload);
}
