// ===== 公益培训 =====

if (!document.getElementById('training-custom-styles')) {
  const style = document.createElement('style');
  style.id = 'training-custom-styles';
  style.innerHTML = `
    .event-details-wrapper.expanded {
      grid-template-rows: 1fr !important;
      opacity: 1 !important;
      margin-bottom: 16px !important;
    }
    .event-desc-html img, .event-desc-html video {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 8px 0;
    }
    .event-desc-html p {
      margin-top: 0;
      margin-bottom: 0.5em;
    }
    .event-desc-html a {
      color: var(--blue-600);
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
}

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
  _renderCalendar([]); // 立即渲染日历框架，防止白屏
  _loadTrainingEvents();
}

function _changeMonth(delta) {
  _currentMonth += delta;
  if (_currentMonth > 12) { _currentMonth = 1; _currentYear++; }
  if (_currentMonth < 1)  { _currentMonth = 12; _currentYear--; }
  _selectedDay = null;
  _updateCalendarTitle();

  const animClass = delta > 0 ? 'cal-slide-left' : 'cal-slide-right';
  _renderCalendar([], animClass); // 立即渲染新月份（暂无事件圆点）
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
    void container.offsetWidth; // Trigger DOM reflow to restart animation
    container.classList.add(animClass);
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

  // 获取网格容器
  const gridContainer = document.getElementById('training-events-grid');
  if (!gridContainer) return;
  
  // 清空容器
  gridContainer.innerHTML = '';

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
    gridContainer.appendChild(emptyTip);
    return;
  }

  // 插入新卡片
  filtered.forEach((ev, i) => {
    const card = _renderEventCard(ev, i);
    gridContainer.appendChild(card);
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

  const hasDesc = !!ev.description;
  const rawDesc = ev.description || '';

  const card = document.createElement('div');
  card.className = `event-card fade-up d${delay}`;
  card.style.margin = '0'; // Override the margin from CSS to rely on grid gap
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.innerHTML = `
    <div class="event-stripe" style="background:${ev.color}; height: 6px;"></div>
    <div class="event-body" style="flex:1; display:flex; flex-direction:column; padding: 20px;">
      <div class="event-date-row" style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
        <div class="event-date-box" style="width: 52px; height: 52px; background: var(--bg-hover); border-radius: 12px; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0; border:1px solid var(--separator);">
          <div class="event-day" style="font-size:20px; font-weight:800; color:${ev.color}; line-height:1;">${day}</div>
          <div class="event-month" style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-top:2px;">${month}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">周${weekDay} · ${timeStr}</div>
          <div style="font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:4px;">
            <ion-icon name="location-outline"></ion-icon> ${_esc(ev.platform || ev.location || '未知地点')}
          </div>
        </div>
        <span class="chip ${chipClass}" style="flex-shrink:0;">${_esc(ev.event_type?.slice(0,2) || '')}</span>
      </div>
      <div class="event-title" style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:8px; line-height:1.4;">${_esc(ev.title)}</div>
      
      <div class="event-info" style="display:flex; gap:16px; font-size:13px; color:var(--text-secondary); margin-bottom:20px; flex-wrap:wrap;">
        <span style="display:flex; align-items:center; gap:4px;"><ion-icon name="person-outline"></ion-icon> ${_esc(ev.speaker)} ${_esc(ev.affiliation ? '（' + ev.affiliation + '）' : '')}</span>
        <span style="display:flex; align-items:center; gap:4px;"><ion-icon name="people-outline"></ion-icon> ${ev.enrolled_cnt} / ${ev.capacity} 人</span>
      </div>

      <div class="event-details-wrapper" style="display:grid; grid-template-rows:0fr; transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; margin-bottom:0;">
        <div class="event-details-inner" style="overflow:hidden;">
          ${hasDesc ? `<div class="event-desc-html" style="font-size:14px; color:var(--text-primary); line-height:1.6; padding:12px 16px; background:var(--bg-elevated); border-radius:var(--r-md); border:1px solid var(--separator); margin-bottom:16px; word-break:break-word;">
            ${rawDesc}
          </div>` : ''}
        </div>
      </div>

      <div style="display:flex; margin-top:auto; gap: 10px;">
        ${hasDesc ? `
        <button class="btn expand-btn" style="flex:0.4; background:var(--bg-hover); color:var(--text-primary); font-weight:600; font-size:14px; border-radius:var(--r-md); transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:4px; padding:12px 0;">
          <span class="expand-text">详情</span>
          <ion-icon name="chevron-down-outline" class="expand-icon" style="transition:transform 0.4s;"></ion-icon>
        </button>
        ` : ''}
        <button class="btn enroll-btn" style="flex:1; background:${ev.enrolled ? 'var(--green-600)' : 'var(--blue-600)'}; color:white; padding:12px; font-weight:600; font-size:15px; border-radius:var(--r-md); transition:all 0.2s;"
          data-event-id="${ev.id}" data-enrolled="${ev.enrolled ? 1 : 0}">
          ${ev.enrolled ? '✓ 已报名 (点击取消)' : '立即报名'}
        </button>
      </div>
    </div>
  `;

  const expandBtn = card.querySelector('.expand-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', function() {
      const wrapper = card.querySelector('.event-details-wrapper');
      const icon = this.querySelector('.expand-icon');
      const text = this.querySelector('.expand-text');
      if (wrapper.classList.contains('expanded')) {
        wrapper.classList.remove('expanded');
        icon.style.transform = 'rotate(0deg)';
        text.textContent = '详情';
      } else {
        wrapper.classList.add('expanded');
        icon.style.transform = 'rotate(180deg)';
        text.textContent = '收起';
      }
    });
  }

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
        this.textContent = '立即报名';
        this.style.background = 'var(--blue-600)';
        showToast('已取消报名');
      } catch (e) { showToast(e.message); }
    } else {
      try {
        await TrainingAPI.enroll(evId);
        this.dataset.enrolled = '1';
        this.textContent = '✓ 已报名 (点击取消)';
        this.style.background = 'var(--green-600)';
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
