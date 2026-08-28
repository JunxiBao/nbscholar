// ===== 公益培训 =====

let _currentMonth = new Date().getMonth() + 1;
let _currentYear  = new Date().getFullYear();
let _allEvents    = [];

function initTraining() {
  // 月历导航
  const prevBtn = document.querySelector('[onclick*="chevron-back"]')?.closest('button')
               || document.querySelectorAll('button[style*="background:none"]')[0];
  const nextBtn = document.querySelectorAll('button[style*="background:none"]')[1];
  if (prevBtn) prevBtn.addEventListener('click', () => _changeMonth(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => _changeMonth(+1));

  // 分类筛选
  document.querySelectorAll('.filter-chip[data-group="train-cat"]').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.filter-chip[data-group="train-cat"]')
        .forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      _renderEventList(_allEvents, this.textContent.trim());
    });
  });

  // 加载活动
  _loadTrainingEvents();
}

function _changeMonth(delta) {
  _currentMonth += delta;
  if (_currentMonth > 12) { _currentMonth = 1; _currentYear++; }
  if (_currentMonth < 1)  { _currentMonth = 12; _currentYear--; }
  _updateCalendarTitle();
  _loadTrainingEvents();
}

function _updateCalendarTitle() {
  const titleEl = document.querySelector('[style*="font-size:16px;font-weight:600"]');
  if (titleEl) titleEl.textContent = `${_currentYear}年 ${_currentMonth}月`;
}

async function _loadTrainingEvents() {
  try {
    const { data } = await TrainingAPI.list({
      year: _currentYear,
      month: _currentMonth,
      per_page: 20,
    });
    _allEvents = data.events;
    _renderCalendar(_allEvents);
    _renderEventList(_allEvents, '全部');
  } catch (e) {
    showToast(`加载培训活动失败：${e.message}`);
  }
}

function _renderCalendar(events) {
  // 更新月历：找到有活动的日期并标记
  const eventDays = new Set(
    events.map(ev => new Date(ev.event_date).getDate())
  );

  const dayEls = document.querySelectorAll('[style*="grid-template-columns:repeat(7"] div');
  dayEls.forEach(el => {
    const day = parseInt(el.textContent.trim(), 10);
    if (!isNaN(day) && eventDays.has(day)) {
      // 简单标记 - 加蓝点
      if (!el.querySelector('.cal-dot')) {
        el.style.position = 'relative';
        const dot = document.createElement('div');
        dot.className = 'cal-dot';
        dot.style.cssText = 'width:4px;height:4px;border-radius:50%;background:var(--blue-600);'
          + 'position:absolute;bottom:2px;left:50%;transform:translateX(-50%);';
        el.appendChild(dot);
      }
    }
  });
}

function _renderEventList(events, filter = '全部') {
  // 找到活动列表容器（第一个 event-card 的父节点）
  const sectionLabel = Array.from(document.querySelectorAll('.section-label'))
    .find(el => el.textContent.includes('近期活动'));
  if (!sectionLabel) return;

  // 更新计数
  const countSpan = sectionLabel.querySelector('span');
  if (countSpan) countSpan.textContent = `共 ${events.length} 场`;

  // 移除旧卡片
  let next = sectionLabel.nextElementSibling;
  while (next && (next.classList.contains('event-card') || next.classList.contains('section-label'))) {
    const toRemove = next;
    next = next.nextElementSibling;
    if (!toRemove.textContent.includes('往期回放')) toRemove.remove();
    else break;
  }

  // 筛选
  const TYPE_MAP = {
    '线上直播': '线上直播', '线下讲座': '线下讲座',
    '录播课程': '录播课程', '工作坊': '工作坊'
  };
  const filtered = filter === '全部'
    ? events
    : events.filter(ev => ev.event_type === (TYPE_MAP[filter] || filter));

  // 插入新卡片
  const insertTarget = document.querySelector('.section-label-action[onclick*="回放"]')?.closest('.section-label')
    || sectionLabel.nextElementSibling;

  filtered.forEach((ev, i) => {
    const card = _renderEventCard(ev, i);
    sectionLabel.parentNode.insertBefore(card, insertTarget || null);
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
