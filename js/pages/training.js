// ===== 公益培训 =====

let _currentMonth = new Date().getMonth() + 1;
let _currentYear  = new Date().getFullYear();
let _allEvents    = [];
let _selectedDay  = null;
let _currentFilter = '全部';

function initTraining() {
  // 月历导航
  const prevBtn = document.getElementById('cal-prev-btn');
  const nextBtn = document.getElementById('cal-next-btn');
  if (prevBtn) prevBtn.onclick = () => _changeMonth(-1);
  if (nextBtn) nextBtn.onclick = () => _changeMonth(+1);

  // 分类筛选
  document.querySelectorAll('.filter-chip[data-group="train-cat"]').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip[data-group="train-cat"]')
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      _currentFilter = this.textContent.trim();
      _selectedDay = null; // 重置日期单选
      _renderCalendar(_allEvents);
      _renderEventList(_allEvents, _currentFilter);
    });
  });

  // 初始标题与加载
  _updateCalendarTitle();
  _loadTrainingEvents();
}

function _changeMonth(delta) {
  _currentMonth += delta;
  if (_currentMonth > 12) { _currentMonth = 1; _currentYear++; }
  if (_currentMonth < 1)  { _currentMonth = 12; _currentYear--; }
  _selectedDay = null;
  _updateCalendarTitle();

  const animClass = delta > 0 ? 'cal-slide-left' : 'cal-slide-right';
  _renderCalendar(_allEvents, animClass);
  _loadTrainingEvents();
}

function _updateCalendarTitle() {
  const titleEl = document.getElementById('cal-month-title') 
               || document.querySelector('[style*="font-size:16px;font-weight:600"]');
  if (titleEl) titleEl.textContent = `${_currentYear}年 ${_currentMonth}月`;
}

async function _loadTrainingEvents() {
  try {
    const { data } = await TrainingAPI.list({
      year: _currentYear,
      month: _currentMonth,
      per_page: 50,
    });
    _allEvents = data.events || [];
    _renderCalendar(_allEvents);
    _renderEventList(_allEvents, _currentFilter);
  } catch (e) {
    showToast(`加载培训活动失败：${e.message}`);
  }
}

function _renderCalendar(events, animClass = '') {
  const container = document.getElementById('training-calendar-days');
  if (!container) return;

  const firstDayOfWeek = new Date(_currentYear, _currentMonth - 1, 1).getDay(); // 0 是周日
  const totalDays = new Date(_currentYear, _currentMonth, 0).getDate();

  const now = new Date();
  const isThisMonth = (now.getFullYear() === _currentYear && (now.getMonth() + 1) === _currentMonth);
  const todayDate = now.getDate();

  // 按日聚合活动
  const eventsByDay = {};
  events.forEach(ev => {
    const d = new Date(ev.event_date);
    if (d.getFullYear() === _currentYear && (d.getMonth() + 1) === _currentMonth) {
      const dayNum = d.getDate();
      if (!eventsByDay[dayNum]) eventsByDay[dayNum] = [];
      eventsByDay[dayNum].push(ev);
    }
  });

  let html = '';
  // 填充月初空白
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += '<div></div>';
  }

  // 填充每一天
  for (let d = 1; d <= totalDays; d++) {
    const hasEvent = !!(eventsByDay[d] && eventsByDay[d].length > 0);
    const isToday = isThisMonth && d === todayDate;
    const isSelected = _selectedDay === d;
    const dotColor = hasEvent ? (eventsByDay[d][0].color || 'var(--blue-600)') : 'transparent';

    html += `
      <div style="display:flex;flex-direction:column;align-items:center;padding:2px 0;">
        <div onclick="_selectDay(${d})" class="cal-day-btn ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvent ? 'has-event' : 'no-event'}">${d}</div>
        <div style="width:4px;height:4px;border-radius:50%;background:${hasEvent ? (isToday ? 'var(--blue-600)' : dotColor) : 'transparent'};margin-top:3px;"></div>
      </div>
    `;
  }

  container.innerHTML = html;

  if (animClass) {
    container.classList.remove('cal-slide-left', 'cal-slide-right');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.classList.add(animClass);
      });
    });
  }
}

function _selectDay(day) {
  if (_selectedDay === day) {
    _selectedDay = null; // 取消选中
  } else {
    _selectedDay = day;
  }
  _renderCalendar(_allEvents);
  _renderEventList(_allEvents, _currentFilter);
}

function _renderEventList(events, filter = '全部') {
  // 找到活动列表容器
  const sectionLabel = Array.from(document.querySelectorAll('.section-label'))
    .find(el => el.textContent.includes('近期活动'));
  if (!sectionLabel) return;

  // 移除旧卡片或空提示
  let next = sectionLabel.nextElementSibling;
  while (next && (next.classList.contains('event-card') || next.id === 'training-empty-tip')) {
    const toRemove = next;
    next = next.nextElementSibling;
    toRemove.remove();
  }

  // 筛选：分类筛选 + 日期筛选
  const TYPE_MAP = {
    '线上直播': '线上直播', '线下讲座': '线下讲座',
    '录播课程': '录播课程', '工作坊': '工作坊'
  };
  let filtered = filter === '全部'
    ? events
    : events.filter(ev => ev.event_type === (TYPE_MAP[filter] || filter));

  if (_selectedDay !== null) {
    filtered = filtered.filter(ev => {
      const d = new Date(ev.event_date);
      return d.getFullYear() === _currentYear && (d.getMonth() + 1) === _currentMonth && d.getDate() === _selectedDay;
    });
  }

  // 更新计数
  const countSpan = sectionLabel.querySelector('span');
  if (countSpan) {
    countSpan.textContent = _selectedDay !== null 
      ? `${_currentMonth}月${_selectedDay}日 共 ${filtered.length} 场`
      : `共 ${filtered.length} 场`;
  }

  if (filtered.length === 0) {
    const emptyTip = document.createElement('div');
    emptyTip.id = 'training-empty-tip';
    emptyTip.className = 'paper-card fade-up';
    emptyTip.style.cssText = 'text-align:center; padding:36px 16px; color:var(--text-tertiary); margin:0 16px 16px;';
    emptyTip.innerHTML = `
      <ion-icon name="calendar-outline" style="font-size:36px; color:var(--text-tertiary); margin-bottom:6px; display:block; margin-left:auto; margin-right:auto;"></ion-icon>
      <div style="font-size:14px; font-weight:500; color:var(--text-secondary);">${_selectedDay !== null ? `${_currentMonth}月${_selectedDay}日暂无培训活动` : '本月暂无此类培训活动'}</div>
    `;
    sectionLabel.parentNode.insertBefore(emptyTip, sectionLabel.nextElementSibling);
    return;
  }

  // 插入新卡片
  filtered.forEach((ev, i) => {
    const card = _renderEventCard(ev, i);
    sectionLabel.parentNode.insertBefore(card, sectionLabel.nextElementSibling);
  });
}

function _renderEventCard(ev, delay = 0) {
  const d = new Date(ev.event_date);
  const day   = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1) + '月';
  const weekDays = ['日','一','二','三','四','五','六'];
  const weekDay = weekDays[d.getDay()];
  const startTime = d.toTimeString().slice(0, 5);
  const endTime   = ev.end_time || '';
  const timeStr   = endTime ? `${startTime} – ${endTime}` : startTime;

  const typeColorMap = {
    '线上直播': 'chip-blue',
    '线下讲座': 'chip-purple',
    '录播课程': 'chip-green',
    '工作坊':   'chip-amber',
  };
  const chipClass = typeColorMap[ev.event_type] || 'chip-gray';

  const card = document.createElement('div');
  card.className = `event-card fade-up d${delay}`;
  card.innerHTML = `
    <div class="event-stripe" style="background:${ev.color};"></div>
    <div class="event-body">
      <div class="event-date-row">
        <div class="event-date-box" style="background:${ev.color};">
          <div class="event-day">${day}</div>
          <div class="event-month">${month}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:500;color:var(--text-primary);">周${weekDay} · ${timeStr}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
            ${_esc(ev.event_type)} · ${_esc(ev.platform || ev.location || '')}
          </div>
        </div>
        <span class="chip ${chipClass}" style="flex-shrink:0;">${_esc(ev.event_type?.slice(0,2) || '')}</span>
      </div>
      <div class="event-title">${_esc(ev.title)}</div>
      <div class="event-info">
        <span><ion-icon name="person-outline"></ion-icon>${_esc(ev.speaker)} ${_esc(ev.affiliation ? '（' + ev.affiliation + '）' : '')}</span>
        <span><ion-icon name="people-outline"></ion-icon>${ev.enrolled_cnt} / ${ev.capacity} 人</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn enroll-btn" style="flex:1;background:${ev.color};color:white;"
          data-event-id="${ev.id}" data-enrolled="${ev.enrolled ? 1 : 0}">
          ${ev.enrolled ? '✓ 已报名' : '一键报名'}
        </button>
        <button class="btn btn-muted btn-sm" onclick="showToast('活动详情：${_esc(ev.title).replace(/'/g,"\\'")}')">详情</button>
      </div>
    </div>
  `;

  // 报名按钮事件
  const enrollBtn = card.querySelector('.enroll-btn');
  if (enrollBtn) enrollBtn.addEventListener('click', async function () {
    if (!Auth.isLoggedIn()) { showToast('请先登录后报名'); return; }
    const evId    = +this.dataset.eventId;
    const isEnrolled = this.dataset.enrolled === '1';
    if (isEnrolled) {
      try {
        await TrainingAPI.cancelEnroll(evId);
        this.dataset.enrolled = '0';
        this.textContent = '一键报名';
        showToast('已取消报名');
      } catch (e) { showToast(e.message); }
    } else {
      try {
        await TrainingAPI.enroll(evId);
        this.dataset.enrolled = '1';
        this.textContent = '✓ 已报名';
        showToast('报名成功！');
      } catch (e) { showToast(e.message); }
    }
  });

  return card;
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
