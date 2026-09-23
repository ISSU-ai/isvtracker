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
    else if (action === 'activity') payload = withLock_(() => appendActivity_(e.parameter || {}));
    else if (action === 'updateTaskStatus') payload = withLock_(() => updateTaskStatus_(e.parameter || {}));
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
      if (payload.action === 'updateTaskStatus') return updateTaskStatus_(payload);
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
  return { status: 'ok', partners: result, generatedAt: new Date().toISOString() };
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
  appendTaskStatusActivity_(ss, payload);
  return { status: 'ok', action: 'updateTaskStatus', taskName: payload.taskName };
}

function appendTaskStatusActivity_(ss, payload) {
  const sheet = ss.getSheetByName(ISV_TRACKER_TABS.activities);
  const headers = headerMap_(sheet);
  const row = Array(sheet.getLastColumn()).fill('');
  setCell_(row, headers, 'Activity ID', 'ACT-' + Utilities.getUuid().slice(0, 8).toUpperCase());
  setCell_(row, headers, 'Partner ID', payload.partnerId || '');
  setCell_(row, headers, 'Date', new Date());
  // The template validation list permits Email, Meeting, Call, Portal, Internal, Other.
  setCell_(row, headers, 'Activity Type', 'Other');
  setCell_(row, headers, 'Summary', payload.activitySummary || (payload.taskName + ' 상태를 ' + (payload.status || 'Not Started') + '(으)로 변경'));
  setCell_(row, headers, 'Created By', payload.createdBy || '');
  sheet.appendRow(row);
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
