(function(window) {
  'use strict';

  var HomeUI = window.HomeUI;
  var isChinese = HomeUI.isChinese;
  var subpageState = HomeUI.subpageState;
  var escapeHtml = HomeUI.escapeHtml;
  var setText = HomeUI.setText;
  var readFormFieldText = HomeUI.readFormFieldText;
  var formatUnixLocalTime = HomeUI.formatUnixLocalTime;

  function enhanceSystemSettingsPage(view)
  {
    var sections = view.querySelectorAll('.cbi-section');
    if (!sections.length)
      return;

    Array.prototype.forEach.call(sections, function(sec) {
      var h = sec.querySelector(':scope > h3:first-child');
      if (!h)
        return;

      var catBadge = h.querySelector('.homeui-sec-cat');
      if (!catBadge) {
        catBadge = document.createElement('span');
        catBadge.className = 'homeui-sec-cat';
        h.insertBefore(catBadge, h.firstChild);
      }
      catBadge.textContent = 'SYSTEM';

      var tabsCount = sec.querySelectorAll('.cbi-tabmenu > li').length;
      var countBadge = h.querySelector('.homeui-sec-count');
      if (!countBadge) {
        countBadge = document.createElement('span');
        countBadge.className = 'homeui-sec-count';
        h.appendChild(countBadge);
      }
      countBadge.textContent = tabsCount ?
        (tabsCount + (isChinese ? ' 个配置分组' : ' tabs')) :
        (isChinese ? '基础参数' : 'Settings');
    });

    var mainEl = document.querySelector('#maincontent') || view.parentNode;
    var shell = mainEl ? mainEl.querySelector('.homeui-sys-shell') : null;
    if (!shell && mainEl) {
      shell = document.createElement('div');
      shell.className = 'homeui-subpage-shell homeui-sys-shell';
      shell.innerHTML =
        '<div class="homeui-subpage-metrics">' +
          '<div class="homeui-subpage-metric is-blue">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '设备主机名' : 'Device Hostname') + '</span>' +
              '<strong data-sys-metric="hostname">HomeWrt</strong>' +
              '<small>' + (isChinese ? '局域网与系统网络标识名称' : 'System & LAN hostname') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-green">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '系统时区与时间' : 'System Timezone') + '</span>' +
              '<strong data-sys-metric="timezone">Asia/Shanghai</strong>' +
              '<small data-sys-metric="localtime-sub">--</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-purple">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? 'NTP 时间同步' : 'NTP Time Sync') + '</span>' +
              '<strong data-sys-metric="ntp">--</strong>' +
              '<small data-sys-metric="ntp-sub">--</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-orange">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '界面主题与语言' : 'Theme & Language') + '</span>' +
              '<strong data-sys-metric="theme">HomeUI</strong>' +
              '<small data-sys-metric="lang-sub">--</small>' +
            '</div>' +
          '</div>' +
        '</div>';

      mainEl.insertBefore(shell, view);

      view.addEventListener('change', function() {
        enhanceSystemSettingsPage(view);
      });
      view.addEventListener('input', function() {
        enhanceSystemSettingsPage(view);
      });
    }

    if (!shell)
      return;

    var hostVal = readFormFieldText(view, 'hostname', 'HomeWrt');
    var tzVal = readFormFieldText(view, 'zonename', 'Asia/Shanghai');
    var localtimeEl = view.querySelector('#localtime');
    var localtimeVal = (localtimeEl && localtimeEl.value) ?
      localtimeEl.value.trim() :
      formatUnixLocalTime(Date.now() / 1000);

    var ntpRow = view.querySelector('.cbi-value[data-name="enabled"]');
    var ntpCb = ntpRow ? ntpRow.querySelector('input[type="checkbox"]') : null;
    var ntpEnabled = ntpCb ? ntpCb.checked : true;
    var ntpServers = view.querySelectorAll('.cbi-value[data-name="server"] .cbi-dynlist > .item').length;

    var langVal = readFormFieldText(view, '_lang', isChinese ? '中文 (简体)' : 'Auto');
    var themeVal = readFormFieldText(view, '_mediaurlbase', 'HomeUI');
    if (/homeui/i.test(themeVal))
      themeVal = 'HomeUI';

    setText(shell, '[data-sys-metric="hostname"]', hostVal);
    setText(shell, '[data-sys-metric="timezone"]', tzVal);
    setText(shell, '[data-sys-metric="localtime-sub"]', localtimeVal);
    setText(
      shell,
      '[data-sys-metric="ntp"]',
      ntpEnabled ? (isChinese ? '客户端已启用' : 'Enabled') : (isChinese ? '未启用' : 'Disabled')
    );
    setText(
      shell,
      '[data-sys-metric="ntp-sub"]',
      (ntpServers || 4) + (isChinese ? ' 个上游 NTP 候选服务器' : ' upstream NTP servers')
    );
    setText(shell, '[data-sys-metric="theme"]', themeVal);
    setText(
      shell,
      '[data-sys-metric="lang-sub"]',
      (isChinese ? '当前显示语言: ' : 'Language: ') + langVal
    );
  }

  function enhanceLogsPage(view, page)
  {
    var contentSyslog = view.querySelector('#content_syslog');
    var syslogEl = view.querySelector('#syslog');
    if (!contentSyslog && !syslogEl)
      return;

    var isDmesg = /dmesg/i.test(page) ||
      (!view.querySelector('#logFacilitySelect') &&
       /内核|kernel|dmesg/i.test((view.querySelector('h2') || {}).textContent || ''));

    if (contentSyslog && contentSyslog.dataset.homeuiEnhanced !== 'true') {
      contentSyslog.dataset.homeuiEnhanced = 'true';

      var head = document.createElement('div');
      head.className = 'homeui-log-card-head';
      head.innerHTML =
        '<div class="homeui-log-card-title">' +
          '<span class="homeui-sec-cat' + (isDmesg ? ' is-purple' : '') + '">' +
            (isDmesg ? 'DMESG' : 'SYSLOG') +
          '</span>' +
          '<span>' +
            (isDmesg ?
              (isChinese ? 'Linux 内核环形缓冲区日志 (dmesg)' : 'Kernel Ring Buffer Log (dmesg)') :
              (isChinese ? '系统运行日志实时视图 (syslog)' : 'System Runtime Log (syslog)')) +
          '</span>' +
        '</div>' +
        '<span class="homeui-sec-count" data-log-visible-count>0 ' +
          (isChinese ? '条记录' : 'lines') +
        '</span>';

      var toolbar = document.createElement('div');
      toolbar.className = 'homeui-log-toolbar';

      var facSelect = contentSyslog.querySelector('#logFacilitySelect');
      var facInvert = contentSyslog.querySelector('#invertLogFacilitySearch');

      var fromTime = contentSyslog.querySelector('#logFromTime');
      var toTime = contentSyslog.querySelector('#logToTime');
      var rangeInvert = contentSyslog.querySelector('#invertLogRangeTime');

      var sevSelect = contentSyslog.querySelector('#logSeveritySelect');
      var sevInvert = contentSyslog.querySelector('#invertLogSeveritySearch') ||
        contentSyslog.querySelector('#invertSeverity');

      var txtInput = contentSyslog.querySelector('#logTextFilter');
      var txtInvert = contentSyslog.querySelector('#invertLogTextSearch');

      var maxInput = contentSyslog.querySelector('#logMaxRows');
      var descSort = contentSyslog.querySelector('#invertAscendingSort');

      var scrollDownBtn = contentSyslog.querySelector('#scrollDownButton');
      var scrollDownWrap = scrollDownBtn ? scrollDownBtn.parentNode : null;

      function createGroupLabel(text) {
        var lbl = document.createElement('label');
        lbl.textContent = text;
        return lbl;
      }

      function createComboControl(controls, invertCb, suffixText) {
        var combo = document.createElement('div');
        combo.className = 'homeui-log-combo';

        controls.forEach(function(ctrl) {
          if (!ctrl)
            return;
          if (ctrl.nodeType === 1)
            ctrl.removeAttribute('style');
          combo.appendChild(ctrl);
        });

        if (suffixText) {
          var suffix = document.createElement('span');
          suffix.className = 'homeui-log-combo-suffix';
          suffix.textContent = suffixText;
          combo.appendChild(suffix);
        }

        if (invertCb) {
          invertCb.removeAttribute('style');
          var chip = document.createElement('label');
          chip.className = 'homeui-log-invert';
          chip.title = isChinese ? '勾选后排除当前筛选项' : 'Exclude matching entries';
          if (invertCb.id)
            chip.setAttribute('for', invertCb.id);
          var span = document.createElement('span');
          span.textContent = isChinese ? '排除' : 'Not';
          chip.appendChild(invertCb);
          chip.appendChild(span);

          var syncInvertState = function() {
            chip.classList.toggle('is-active', !!invertCb.checked);
            combo.classList.toggle('is-inverted', !!invertCb.checked);
          };
          invertCb.addEventListener('change', syncInvertState);
          syncInvertState();

          combo.appendChild(chip);
        }

        return combo;
      }

      if (facSelect) {
        var gFac = document.createElement('div');
        gFac.className = 'homeui-log-filter-group';
        gFac.appendChild(createGroupLabel(isChinese ? '类型：' : 'Facility:'));
        gFac.appendChild(createComboControl([facSelect], facInvert, ''));
        toolbar.appendChild(gFac);
      }

      if (fromTime && toTime) {
        var gTime = document.createElement('div');
        gTime.className = 'homeui-log-filter-group';
        gTime.appendChild(createGroupLabel(isChinese ? '时间范围：' : 'Time range:'));
        var sep = document.createElement('span');
        sep.className = 'homeui-log-range-sep';
        sep.textContent = '~';
        gTime.appendChild(createComboControl([fromTime, sep, toTime], rangeInvert, ''));
        toolbar.appendChild(gTime);
      }

      if (sevSelect) {
        var gSev = document.createElement('div');
        gSev.className = 'homeui-log-filter-group';
        gSev.appendChild(createGroupLabel(isChinese ? '级别：' : 'Severity:'));
        gSev.appendChild(
          createComboControl(
            [sevSelect],
            sevInvert,
            isDmesg ? (isChinese ? '及以上' : 'and above') : ''
          )
        );
        toolbar.appendChild(gSev);
      }

      if (txtInput) {
        if (!txtInput.placeholder)
          txtInput.placeholder = isChinese ? '输入关键字筛选日志...' : 'Filter log text...';
        var gTxt = document.createElement('div');
        gTxt.className = 'homeui-log-filter-group';
        gTxt.appendChild(createGroupLabel(isChinese ? '包含：' : 'Including:'));
        gTxt.appendChild(createComboControl([txtInput], txtInvert, ''));
        toolbar.appendChild(gTxt);
      }

      if (maxInput) {
        if (!maxInput.placeholder)
          maxInput.placeholder = '1000';
        maxInput.removeAttribute('style');
        var gMax = document.createElement('div');
        gMax.className = 'homeui-log-filter-group';
        gMax.appendChild(createGroupLabel(isChinese ? '最大行数：' : 'Max rows:'));
        gMax.appendChild(maxInput);
        toolbar.appendChild(gMax);
      }

      if (descSort) {
        descSort.removeAttribute('style');
        var sortPill = document.createElement('label');
        sortPill.className = 'homeui-log-sort-pill';
        if (descSort.id)
          sortPill.setAttribute('for', descSort.id);
        var sortSpan = document.createElement('span');
        sortSpan.textContent = isChinese ? '倒序排列' : 'Reverse sort';
        sortPill.appendChild(descSort);
        sortPill.appendChild(sortSpan);

        var syncSortState = function() {
          sortPill.classList.toggle('is-active', !!descSort.checked);
        };
        descSort.addEventListener('change', syncSortState);
        syncSortState();

        toolbar.appendChild(sortPill);
      }

      var actionsBox = document.createElement('div');
      actionsBox.className = 'homeui-log-actions';
      if (scrollDownBtn)
        actionsBox.appendChild(scrollDownBtn);
      toolbar.appendChild(actionsBox);

      var triggerRefresh = function() {
        setTimeout(function() { enhanceLogsPage(view, page); }, 60);
        setTimeout(function() { enhanceLogsPage(view, page); }, 250);
      };
      toolbar.addEventListener('change', triggerRefresh);
      toolbar.addEventListener('input', triggerRefresh);

      Array.prototype.forEach.call(
        contentSyslog.querySelectorAll(':scope > div[style*="margin-bottom"]'),
        function(oldRow) {
          oldRow.remove();
        }
      );

      if (scrollDownWrap &&
          scrollDownWrap !== contentSyslog &&
          !scrollDownWrap.children.length) {
        scrollDownWrap.remove();
      }

      contentSyslog.insertBefore(toolbar, contentSyslog.firstChild);
      contentSyslog.insertBefore(head, toolbar);
    }

    var mainEl = document.querySelector('#maincontent') || view.parentNode;
    var shell = mainEl ? mainEl.querySelector('.homeui-logs-shell') : null;
    if (!shell && mainEl) {
      shell = document.createElement('div');
      shell.className = 'homeui-subpage-shell homeui-logs-shell';
      shell.innerHTML =
        '<div class="homeui-subpage-metrics">' +
          '<div class="homeui-subpage-metric is-blue">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '日志记录总数' : 'Total Log Lines') + '</span>' +
              '<strong data-log-metric="total">0</strong>' +
              '<small>' + (isChinese ? '当前视图匹配显示的日志总行数' : 'Matching log lines in buffer') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-green">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '常规与通知 (Info)' : 'Info & Notice') + '</span>' +
              '<strong data-log-metric="info">0</strong>' +
              '<small>' + (isChinese ? '系统常规运行与服务状态通知' : 'Routine system & service events') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-orange">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="m10.29 3.86-8.47 14.14A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '告警事件 (Warning)' : 'Warnings') + '</span>' +
              '<strong data-log-metric="warn">0</strong>' +
              '<small>' + (isChinese ? '需要注意的配置或运行期告警' : 'Configuration or runtime warnings') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-purple">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '错误与异常 (Error)' : 'Errors & Critical') + '</span>' +
              '<strong data-log-metric="err">0</strong>' +
              '<small>' + (isChinese ? '错误、严重异常及失败事件记录' : 'Errors, critical & failure events') + '</small>' +
            '</div>' +
          '</div>' +
        '</div>';

      var topTabs = mainEl.querySelector(':scope > .tabs');
      if (topTabs)
        mainEl.insertBefore(shell, topTabs);
      else
        mainEl.insertBefore(shell, view);
    }

    var rawText = syslogEl ? (syslogEl.value || syslogEl.textContent || '') : '';
    var lines = rawText ?
      rawText.split(/\r?\n/).filter(function(l) { return l.trim().length > 0; }) :
      [];
    var totalCount = lines.length;
    var warnCount = 0;
    var errCount = 0;
    var infoCount = 0;

    lines.forEach(function(line) {
      if (/\.(?:err|crit|alert|emerg)\b|\b(?:error|failed|fatal|panic|segfault)\b/i.test(line))
        errCount++;
      else if (/\.(?:warn|warning)\b|\bwarning\b/i.test(line))
        warnCount++;
      else
        infoCount++;
    });

    if (shell) {
      setText(shell, '[data-log-metric="total"]', totalCount);
      setText(shell, '[data-log-metric="info"]', infoCount);
      setText(shell, '[data-log-metric="warn"]', warnCount);
      setText(shell, '[data-log-metric="err"]', errCount);
    }

    if (contentSyslog) {
      setText(
        contentSyslog,
        '[data-log-visible-count]',
        totalCount + (isChinese ? ' 条记录' : ' lines')
      );
    }
  }

  function applyProcessesFilter(view, tabVal, query)
  {
    var q = (query || '').trim().toLowerCase();
    var table = view.querySelector('.table');
    if (!table)
      return;

    var rows = table.querySelectorAll('.tr:not(.table-titles):not(.cbi-section-table-titles):not(.placeholder)');
    var visibleCount = 0;

    Array.prototype.forEach.call(rows, function(row) {
      var cat = row.dataset.procCat || 'user';
      var isActive = row.dataset.procActive === 'true';
      var tabMatch =
        tabVal === 'all' ||
        (tabVal === 'active' ? isActive : cat === tabVal);
      var textMatch = !q || row.textContent.toLowerCase().includes(q);
      var show = tabMatch && textMatch;
      row.style.display = show ? '' : 'none';
      if (show)
        visibleCount++;
    });

    setText(
      view,
      '[data-proc-visible-count]',
      visibleCount + (isChinese ? ' 个进程' : ' processes')
    );
  }

  function enhanceProcessesPage(view)
  {
    var table = view.querySelector('.table');
    if (!table)
      return;

    var card = view.querySelector('.homeui-proc-card');
    if (!card) {
      card = document.createElement('section');
      card.className = 'homeui-proc-card';
      card.innerHTML =
        '<div class="homeui-proc-card-head">' +
          '<div class="homeui-proc-card-title">' +
            '<span class="homeui-sec-cat">PROCESS</span>' +
            '<span>' + (isChinese ? '系统活动进程实时监控列表' : 'Active System Processes') + '</span>' +
          '</div>' +
          '<span class="homeui-sec-count" data-proc-visible-count>0 ' +
            (isChinese ? '个进程' : 'processes') +
          '</span>' +
        '</div>';
      table.parentNode.insertBefore(card, table);
      card.appendChild(table);
    }

    var actionTh = table.querySelector('.tr.table-titles .th:nth-child(6)');
    if (actionTh && !actionTh.textContent.trim())
      actionTh.textContent = isChinese ? '操作控制' : 'Actions';

    var rows = table.querySelectorAll('.tr:not(.table-titles):not(.cbi-section-table-titles):not(.placeholder)');
    var totalProcs = 0;
    var userProcs = 0;
    var kernelProcs = 0;
    var activeProcs = 0;
    var sumCpu = 0;
    var sumMem = 0;

    Array.prototype.forEach.call(rows, function(row) {
      var cells = row.querySelectorAll('.td');
      if (cells.length < 5)
        return;

      var cmdTxt = (cells[2] ? cells[2].textContent : '').trim();
      var cpuVal = parseFloat((cells[3] ? cells[3].textContent : '0').replace('%', '')) || 0;
      var memVal = parseFloat((cells[4] ? cells[4].textContent : '0').replace('%', '')) || 0;

      totalProcs++;
      sumCpu += cpuVal;
      sumMem += memVal;

      var isKernel = /^\[.*\]$/.test(cmdTxt);
      var isActive = cpuVal > 0 || memVal > 0;

      row.dataset.procCat = isKernel ? 'kernel' : 'user';
      row.dataset.procActive = isActive ? 'true' : 'false';

      if (isKernel)
        kernelProcs++;
      else
        userProcs++;

      if (isActive)
        activeProcs++;
    });

    var mainEl = document.querySelector('#maincontent') || view.parentNode;
    var shell = mainEl ? mainEl.querySelector('.homeui-proc-shell') : null;
    if (!shell && mainEl) {
      shell = document.createElement('div');
      shell.className = 'homeui-subpage-shell homeui-proc-shell';
      shell.innerHTML =
        '<div class="homeui-subpage-metrics">' +
          '<div class="homeui-subpage-metric is-blue">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '运行进程总数' : 'Total Processes') + '</span>' +
              '<strong data-proc-metric="total">0</strong>' +
              '<small>' + (isChinese ? '当前系统活跃进程与内核线程' : 'Total active processes & threads') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-green">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M4 4h16v6H4zM4 14h16v6H4z"/><path d="M8 7h.01M8 17h.01"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '用户态服务进程' : 'User Space Daemons') + '</span>' +
              '<strong data-proc-metric="user">0</strong>' +
              '<small>' + (isChinese ? '系统守护服务与应用程序实例' : 'System services & user applications') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-purple">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '内核工作线程' : 'Kernel Threads') + '</span>' +
              '<strong data-proc-metric="kernel">0</strong>' +
              '<small>' + (isChinese ? 'Linux 内核调度与工作队列线程' : 'Kernel scheduling & kworker threads') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-orange">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '活跃资源占用进程' : 'Active Resource Tasks') + '</span>' +
              '<strong data-proc-metric="active">0</strong>' +
              '<small data-proc-metric="load-sub">CPU 0% · MEM 0%</small>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="homeui-subpage-bar">' +
          '<div class="homeui-subpage-tabs" data-proc-tabs>' +
            '<button type="button" class="homeui-subpage-tab is-active" data-proc-tab="all">' +
              (isChinese ? '全部进程' : 'All Processes') +
              ' <em class="tab-count" data-proc-cnt="all">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-proc-tab="user">' +
              (isChinese ? '用户态服务' : 'User Daemons') +
              ' <em class="tab-count" data-proc-cnt="user">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-proc-tab="kernel">' +
              (isChinese ? '内核工作线程' : 'Kernel Threads') +
              ' <em class="tab-count" data-proc-cnt="kernel">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-proc-tab="active">' +
              (isChinese ? '非零资源占用' : 'Active Load') +
              ' <em class="tab-count" data-proc-cnt="active">0</em>' +
            '</button>' +
          '</div>' +
          '<div class="homeui-subpage-toolbar">' +
            '<label class="homeui-subpage-search">' +
              '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>' +
              '<input type="search" data-proc-search placeholder="' +
                (isChinese ? '搜索 PID / 用户名 / 进程命令...' : 'Filter PID, user, command...') +
              '">' +
            '</label>' +
          '</div>' +
        '</div>';

      mainEl.insertBefore(shell, view);

      shell.addEventListener('click', function(ev) {
        var tabBtn = ev.target.closest('[data-proc-tab]');
        if (!tabBtn)
          return;
        subpageState.procTab = tabBtn.dataset.procTab;
        Array.prototype.forEach.call(
          shell.querySelectorAll('[data-proc-tab]'),
          function(b) { b.classList.toggle('is-active', b === tabBtn); }
        );
        applyProcessesFilter(view, subpageState.procTab, subpageState.procQuery);
      });

      var searchIn = shell.querySelector('[data-proc-search]');
      if (searchIn) {
        searchIn.addEventListener('input', function() {
          subpageState.procQuery = searchIn.value;
          applyProcessesFilter(view, subpageState.procTab, subpageState.procQuery);
        });
      }
    }

    if (shell) {
      setText(shell, '[data-proc-metric="total"]', totalProcs);
      setText(shell, '[data-proc-metric="user"]', userProcs);
      setText(shell, '[data-proc-metric="kernel"]', kernelProcs);
      setText(shell, '[data-proc-metric="active"]', activeProcs);
      setText(
        shell,
        '[data-proc-metric="load-sub"]',
        (isChinese ? '累计 CPU: ' : 'CPU: ') + Math.min(100, Math.round(sumCpu)) + '% · ' +
        (isChinese ? '累计内存: ' : 'MEM: ') + Math.min(100, Math.round(sumMem)) + '%'
      );

      setText(shell, '[data-proc-cnt="all"]', totalProcs);
      setText(shell, '[data-proc-cnt="user"]', userProcs);
      setText(shell, '[data-proc-cnt="kernel"]', kernelProcs);
      setText(shell, '[data-proc-cnt="active"]', activeProcs);
    }

    applyProcessesFilter(view, subpageState.procTab, subpageState.procQuery);
  }


  HomeUI.enhanceSystemSettingsPage = enhanceSystemSettingsPage;
  HomeUI.enhanceLogsPage = enhanceLogsPage;
  HomeUI.enhanceProcessesPage = enhanceProcessesPage;
})(window);
