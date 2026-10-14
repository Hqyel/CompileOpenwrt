(function(window) {
  'use strict';

  var root = document.documentElement;
  var collapseButton = document.querySelector('#homeui-collapse');
  var colorButton = document.querySelector('#homeui-color-toggle');
  var colorLabel = document.querySelector('.homeui-color-label');
  var topMenu = document.querySelector('#topmenu');
  var indicators = document.querySelector('#indicators');
  var searchTrigger = document.querySelector('#homeui-search-trigger');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  var isChinese = (root.lang || '').toLowerCase().startsWith('zh');

  function resolveCurrentPageId()
  {
    var bodyPage = (document.body && document.body.dataset.page) || '';
    if (!bodyPage && window.L && window.L.env) {
      var dp = window.L.env.dispatchpath || window.L.env.requestpath;
      if (Array.isArray(dp) && dp.length)
        bodyPage = dp.join('-');
    }
    if (!bodyPage) {
      var pathname = (window.location && window.location.pathname) || '';
      var m = pathname.match(/\/admin\/[a-z0-9_/-]+/i);
      if (m)
        bodyPage = m[0].replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
    }
    if (/admin-status-routes/.test(bodyPage))
      bodyPage = 'admin-status-routes';
    else if (/admin-status-nftables/.test(bodyPage))
      bodyPage = 'admin-status-nftables';
    else if (/admin-status-iptables/.test(bodyPage))
      bodyPage = 'admin-status-iptables';
    else if (/admin-status-wireguard/.test(bodyPage))
      bodyPage = 'admin-status-wireguard';
    else if (/admin-status-processes/.test(bodyPage))
      bodyPage = 'admin-status-processes';
    else if (/admin-system-system/.test(bodyPage))
      bodyPage = 'admin-system-system';
    else if (/admin-status-(?:logs|syslog|dmesg)/.test(bodyPage) &&
             bodyPage.indexOf('admin-status-') !== 0) {
      var logMatch = bodyPage.match(/admin-status-(?:logs(?:-[a-z0-9_]+)?|syslog|dmesg)/i);
      bodyPage = logMatch ? logMatch[0] : 'admin-status-logs';
    }
    else if (/admin-status-realtime/.test(bodyPage) &&
             bodyPage.indexOf('admin-status-realtime') !== 0) {
      var rtMatch = bodyPage.match(/admin-status-realtime(?:-[a-z0-9_]+)?/i);
      bodyPage = rtMatch ? rtMatch[0] : 'admin-status-realtime';
    }
    else if (/admin-status-overview/.test(bodyPage))
      bodyPage = 'admin-status-overview';
    else if (/admin-network(?:-network)?$/.test(bodyPage))
      bodyPage = 'admin-network-network';

    if (bodyPage && document.body && document.body.dataset.page !== bodyPage)
      document.body.dataset.page = bodyPage;

    return bodyPage;
  }

  var pageId = resolveCurrentPageId();
  var isOverview = pageId === 'admin-status-overview';
  var isRoutesPage = pageId === 'admin-status-routes';
  var isFirewallStatusPage =
    pageId === 'admin-status-nftables' ||
    pageId === 'admin-status-iptables';
  var isRealtimePage = /^admin-status-realtime/.test(pageId);
  var isWireguardPage = pageId === 'admin-status-wireguard';
  var isSystemPage = pageId === 'admin-system-system';
  var isLogsPage = /^admin-status-(?:logs|syslog|dmesg)/.test(pageId);
  var isProcessesPage = pageId === 'admin-status-processes';
  var isNetworkPage =
    pageId === 'admin-network-network' ||
    pageId === 'admin-network';
  var isFirewallPage = /^admin-network-firewall/.test(pageId);
  var isStandalonePage =
    isOverview ||
    isProcessesPage ||
    isLogsPage ||
    isSystemPage ||
    isNetworkPage ||
    isFirewallPage;

  if (isStandalonePage)
    root.classList.add('homeui-overview-single-rail');

  var chartState = {
    rateStat: 'avg',
    rateRange: 'live',
    clientStat: 'avg',
    clientType: 'wired',
    clientRange: 'live',
    memStat: 'avg',
    memRange: 'live',
    bottomTab: 'leases'
  };

  var subpageState = {
    routesTab: 'all',
    routesQuery: '',
    fwTab: 'all',
    fwHideEmpty: true,
    fwQuery: '',
    wgTab: 'all',
    wgQuery: '',
    procTab: 'all',
    procQuery: '',
    dmesgQuery: ''
  };

  var liveState = {
    interfaceStats: {},
    clientSamples: [],
    memorySamples: [],
    ifaces: [],
    selectedWanKey: '',
    statsPollBusy: false,
    memoryPollBusy: false,
    throughputPollBusy: false,
    historyPollBusy: false,
    history: {
      interfaces: {},
      memorySamples: [],
      clientSamples: [],
      available: false,
      loadedAt: 0
    },
    clientSamplePending: false,
    memorySamplePending: false,
    tcpCount: 0,
    udpCount: 0,
    icmpCount: 0,
    connTotal: 0,
    wiredClients: 0,
    wirelessClients: 0,
    totalClients: 0,
    cpuPct: null,
    memPct: null,
    diskPct: null,
    memDetail: '',
    cacheDetail: '',
    diskDetail: '',
    tmpDetail: '',
    cachePct: 0,
    tmpPct: 0,
    boardInfo: null,
    sysInfo: null,
    rpcLeases: [],
    rpcStorageRows: [],
    leases: [],
    storageRows: []
  };

  var SHORTCUT_CATALOG = [
    {
      id: 'interfaces',
      zh: '内外网设置',
      en: 'Interfaces',
      path: 'admin/network/network',
      icon: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16"/>'
    },
    {
      id: 'nlbw',
      zh: '终端监控',
      en: 'Client Monitor',
      path: 'admin/status/nlbw',
      icon: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 10h2m2 0h2m2 0h2"/>'
    },
    {
      id: 'passwall',
      zh: 'PassWall',
      en: 'PassWall',
      path: 'admin/services/passwall',
      icon: '<path d="M12 2 4 6v6c0 5.5 3.4 10.6 8 12 4.6-1.4 8-6.5 8-12V6l-8-4z"/><path d="m9 12 2 2 4-4"/>'
    },
    {
      id: 'firewall',
      zh: 'ACL/防火墙',
      en: 'Firewall',
      path: 'admin/network/firewall',
      icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 10h6M9 14h6"/>'
    },
    {
      id: 'docker',
      zh: 'Docker',
      en: 'Docker',
      path: 'admin/docker/containers',
      icon: '<rect x="4" y="10" width="4" height="4" rx=".6"/><rect x="9" y="10" width="4" height="4" rx=".6"/><rect x="14" y="10" width="4" height="4" rx=".6"/><rect x="9" y="5" width="4" height="4" rx=".6"/><path d="M2 14.5c1 3.3 4.2 5 9.5 5 5.6 0 9-2.7 10-6.5"/>'
    },
    {
      id: 'wireguard',
      zh: 'WireGuard',
      en: 'WireGuard',
      path: 'admin/status/wireguard',
      icon: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19v-1.5A4.5 4.5 0 0 1 7.5 13h1A4.5 4.5 0 0 1 13 17.5V19m0-5.5h3.5A4.5 4.5 0 0 1 21 18v1"/>'
    },
    {
      id: 'ddns',
      zh: 'DDNS-Go',
      en: 'DDNS-Go',
      path: 'admin/services/ddns-go',
      icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 12v3"/>'
    },
    {
      id: 'uugamebooster',
      zh: 'UU加速器',
      en: 'UU Booster',
      path: 'admin/services/uugamebooster',
      icon: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
    },
    {
      id: 'ttyd',
      zh: '终端工具',
      en: 'Terminal',
      path: 'admin/services/ttyd',
      icon: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>'
    },
    {
      id: 'dhcp',
      zh: 'DHCP/DNS',
      en: 'DHCP/DNS',
      path: 'admin/network/dhcp',
      icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/>'
    },
    {
      id: 'wireless',
      zh: '无线网络',
      en: 'Wireless',
      path: 'admin/network/wireless',
      icon: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>'
    },
    {
      id: 'routes',
      zh: '路由表',
      en: 'Routes',
      path: 'admin/status/routes',
      icon: '<path d="M4 8h13l-3-3m6 11H7l3 3"/>'
    },
    {
      id: 'realtime',
      zh: '实时监控',
      en: 'Realtime Graphs',
      path: 'admin/status/realtime',
      icon: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'
    },
    {
      id: 'diagnostics',
      zh: '网络诊断',
      en: 'Diagnostics',
      path: 'admin/network/diagnostics',
      icon: '<path d="m22 12-4 0-3 9L9 3l-3 9-4 0"/>'
    },
    {
      id: 'packages',
      zh: '软件包管理',
      en: 'Software',
      path: 'admin/system/package-manager',
      icon: '<path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'
    },
    {
      id: 'mounts',
      zh: '挂载点',
      en: 'Mount Points',
      path: 'admin/system/mounts',
      icon: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'
    },
    {
      id: 'flash',
      zh: '备份与升级',
      en: 'Backup / Flash',
      path: 'admin/system/flash',
      icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
    },
    {
      id: 'reboot',
      zh: '重启设备',
      en: 'Reboot',
      path: 'admin/system/reboot',
      icon: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>'
    }
  ];

  var DEFAULT_SHORTCUT_IDS = [
    'interfaces',
    'nlbw',
    'passwall',
    'firewall',
    'docker',
    'wireguard',
    'ddns',
    'uugamebooster',
    'ttyd'
  ];


  function pad2(n)
  {
    return n < 10 ? '0' + n : String(n);
  }

  function buildUrl(path)
  {
    if (window.L && typeof window.L.url === 'function')
      return window.L.url.apply(window.L, path.split('/'));
    return '/cgi-bin/luci/' + path;
  }

  function applyColorMode(mode)
  {
    var isDark = mode === 'dark' ||
      (mode === 'auto' && darkQuery.matches);
    var labels = {
      auto: 'Auto',
      light: 'Light',
      dark: 'Dark'
    };

    root.dataset.colorMode = mode;
    root.dataset.darkmode = isDark ? 'true' : 'false';
    localStorage.setItem('homeui-color-mode', mode);

    if (colorLabel) {
      colorLabel.textContent = labels[mode];
      colorButton.title = labels[mode];
    }
  }

  function setSidebarCollapsed(collapsed)
  {
    root.classList.toggle('homeui-collapsed', collapsed);
    localStorage.setItem(
      'homeui-sidebar',
      collapsed ? 'collapsed' : 'expanded'
    );
  }

  function toggleSidebar()
  {
    if (window.matchMedia('(max-width: 900px)').matches) {
      root.classList.toggle('homeui-mobile-panel-open');
      return;
    }

    setSidebarCollapsed(!root.classList.contains('homeui-collapsed'));
  }

  function expandSidebarOnMenuClick(event)
  {
    if (!event.target.closest('a'))
      return;

    if (window.matchMedia('(max-width: 900px)').matches)
      return;

    if (root.classList.contains('homeui-collapsed'))
      setSidebarCollapsed(false);
  }

  function labelIndicators()
  {
    if (!indicators)
      return;

    Array.prototype.forEach.call(indicators.children, function(item) {
      var label = item.textContent.trim();
      var control;

      if (label && !item.title)
        item.title = label;

      if (!/refresh|刷新|poll/i.test(label) &&
          item.dataset.indicator !== 'poll-status' &&
          !item.classList.contains('homeui-refresh-item'))
        return;

      item.classList.add('homeui-refresh-item');
      control = item.matches('a, button, .label') ? item :
        item.querySelector('a, button, .label') || item;
      control.classList.add('homeui-refresh-control');
      control.setAttribute('aria-label', item.title || label);

      if (!control.querySelector('.homeui-refresh-icon')) {
        control.innerHTML = '<svg class="homeui-refresh-icon" ' +
          'viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M20 11a8 8 0 1 0 2 5"/>' +
          '<path d="M20 4v7h-7"/></svg>';
      }
    });
  }

  function openSearchModal()
  {
    var existing = document.querySelector('#homeui-search-modal');
    if (existing) {
      existing.hidden = false;
      var input = existing.querySelector('input');
      if (input) {
        input.value = '';
        input.focus();
        renderSearchResults('');
      }
      return;
    }

    var modal = document.createElement('div');
    modal.id = 'homeui-search-modal';
    modal.className = 'homeui-search-overlay';
    modal.innerHTML =
      '<div class="homeui-search-dialog" role="dialog" aria-modal="true">' +
        '<div class="homeui-search-head">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true">' +
            '<circle cx="11" cy="11" r="6.5"></circle>' +
            '<path d="m16 16 4.2 4.2"></path>' +
          '</svg>' +
          '<input type="search" placeholder="' +
            (isChinese ? '搜索菜单或功能页面...' : 'Search menu...') +
          '" autocomplete="off">' +
          '<kbd>ESC</kbd>' +
        '</div>' +
        '<ul class="homeui-search-list"></ul>' +
      '</div>';

    document.body.appendChild(modal);

    var searchInput = modal.querySelector('input');
    modal.addEventListener('click', function(ev) {
      if (ev.target === modal)
        modal.hidden = true;
    });

    searchInput.addEventListener('input', function() {
      renderSearchResults(searchInput.value);
    });

    searchInput.addEventListener('keydown', function(ev) {
      if (ev.key === 'Escape') {
        modal.hidden = true;
      } else if (ev.key === 'Enter') {
        var first = modal.querySelector('.homeui-search-list a');
        if (first)
          window.location.href = first.href;
      }
    });

    renderSearchResults('');
    searchInput.focus();
  }

  function renderSearchResults(query)
  {
    var modal = document.querySelector('#homeui-search-modal');
    if (!modal)
      return;

    var list = modal.querySelector('.homeui-search-list');
    var items = window.__homeuiMenuItems || [
      { title: '系统概况', group: '状态', href: buildUrl('admin/status/overview') },
      { title: '接口设置', group: '网络', href: buildUrl('admin/network/network') },
      { title: '防火墙', group: '网络', href: buildUrl('admin/network/firewall') },
      { title: 'PassWall', group: '服务', href: buildUrl('admin/services/passwall') },
      { title: 'Docker 容器', group: 'Docker', href: buildUrl('admin/docker/containers') },
      { title: '系统设置', group: '系统', href: buildUrl('admin/system/system') }
    ];
    var q = (query || '').trim().toLowerCase();
    var filtered = items.filter(function(it) {
      return !q ||
        it.title.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q);
    }).slice(0, 10);

    list.innerHTML = '';
    if (!filtered.length) {
      var empty = document.createElement('li');
      empty.className = 'homeui-search-empty';
      empty.textContent = isChinese ? '无匹配菜单项' : 'No matching menu items';
      list.appendChild(empty);
      return;
    }

    filtered.forEach(function(it) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      var title = document.createElement('span');
      var group = document.createElement('small');

      a.href = it.href;
      title.textContent = it.title;
      group.textContent = it.group;
      a.appendChild(title);
      a.appendChild(group);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function formatBytes(bytes)
  {
    var b = Number(bytes) || 0;
    if (b <= 0)
      return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var idx = 0;
    while (b >= 1024 && idx < units.length - 1) {
      b /= 1024;
      idx++;
    }
    return (idx === 0 ? Math.round(b) : b.toFixed(2)) + ' ' + units[idx];
  }

  function formatRate(bytesPerSec)
  {
    return formatBytes(bytesPerSec) + '/s';
  }

  function formatRateKB(kbPerSec)
  {
    return formatRate((Number(kbPerSec) || 0) * 1024);
  }

  function formatUptimeChinese(raw)
  {
    if (!raw || raw === '--')
      return isChinese ? '运行正常' : 'Running';

    if (typeof raw === 'number') {
      var sec = Math.max(0, Math.floor(raw));
      var days = Math.floor(sec / 86400);
      var hours = Math.floor((sec % 86400) / 3600);
      var mins = Math.floor((sec % 3600) / 60);
      var secs = sec % 60;
      if (!isChinese)
        return (days ? days + 'd ' : '') + hours + 'h ' + mins + 'm';
      return (days ? days + '天' : '') +
        hours + '时' +
        mins + '分' +
        (!days ? secs + '秒' : '');
    }

    var str = String(raw).trim();
    if (!isChinese)
      return str;

    var d = str.match(/(\d+)\s*(?:d|day|天)/i);
    var h = str.match(/(\d+)\s*(?:h|hour|小时|时)/i);
    var m = str.match(/(\d+)\s*(?:m|min|分)/i);
    var s = str.match(/(\d+)\s*(?:s|sec|秒)/i);

    if (d || h || m) {
      return (d ? d[1] + '天' : '') +
        (h ? h[1] + '时' : '0时') +
        (m ? m[1] + '分' : '0分') +
        (!d && s ? s[1] + '秒' : '');
    }

    var colonMatch = str.match(/(?:(\d+)d\s*)?(\d+):(\d+):(\d+)/i);
    if (colonMatch) {
      return (colonMatch[1] ? colonMatch[1] + '天' : '') +
        parseInt(colonMatch[2], 10) + '时' +
        parseInt(colonMatch[3], 10) + '分';
    }

    return str;
  }

  function formatUnixLocalTime(ts)
  {
    var n = Number(ts) || 0;
    if (!n)
      return '';
    var d = new Date(n * 1000);
    var useUtc = Math.abs(n * 1000 - Date.now()) > 3600 * 1000;
    var yr = useUtc ? d.getUTCFullYear() : d.getFullYear();
    var mo = pad2((useUtc ? d.getUTCMonth() : d.getMonth()) + 1);
    var dy = pad2(useUtc ? d.getUTCDate() : d.getDate());
    var hr = pad2(useUtc ? d.getUTCHours() : d.getHours());
    var mi = pad2(useUtc ? d.getUTCMinutes() : d.getMinutes());
    var sc = pad2(useUtc ? d.getUTCSeconds() : d.getSeconds());
    return yr + '-' + mo + '-' + dy + ' ' + hr + ':' + mi + ':' + sc;
  }

  function escapeHtml(str)
  {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setText(rootEl, selector, value)
  {
    var el = rootEl.querySelector(selector);
    if (el && value !== undefined && value !== null && el.textContent !== String(value))
      el.textContent = String(value);
  }

  function getSectionHeadingText(section)
  {
    var h = section.querySelector('h3, h4, .cbi-section-title, .cbi-title');
    if (!h)
      return '';
    var clone = h.cloneNode(true);
    Array.prototype.forEach.call(
      clone.querySelectorAll('button, a, .homeui-sec-count, .homeui-sec-cat'),
      function(el) { el.remove(); }
    );
    return clone.textContent.trim();
  }

  function countValidSectionRows(section)
  {
    if (!section)
      return 0;
    var rows = section.querySelectorAll(
      '.table .tr:not(.table-titles):not(.cbi-section-table-titles), ' +
      'table tbody tr'
    );
    var count = 0;
    Array.prototype.forEach.call(rows, function(r) {
      if (r.classList.contains('cbi-section-table-titles') ||
          r.classList.contains('table-titles') ||
          r.classList.contains('placeholder'))
        return;
      var txt = r.textContent.trim();
      if (!txt || /没有|无.*记录|无.*规则|暂无|no\s+entries|no\s+rules|no\s+chains|empty/i.test(txt))
        return;
      count++;
    });
    return count;
  }

  function applySubpageFilter(view, tabVal, query, hideEmpty)
  {
    var q = (query || '').trim().toLowerCase();
    var units = view.querySelectorAll('.homeui-fw-unit');
    if (!units.length)
      units = view.querySelectorAll('.cbi-section:not(.homeui-nft-table-head)');

    Array.prototype.forEach.call(units, function(sec) {
      var cat = sec.dataset.homeuiCat || 'other';
      var rowCount = Number(sec.dataset.homeuiRows || 0);
      var tabMatch = tabVal === 'all' || cat === tabVal;
      var emptyBlocked = hideEmpty && rowCount === 0;

      if (!tabMatch || emptyBlocked) {
        sec.classList.add('homeui-sec-hidden');
        return;
      }

      var rows = sec.querySelectorAll(
        '.table .tr:not(.table-titles):not(.cbi-section-table-titles), ' +
        'table tbody tr'
      );
      if (!q || !rows.length) {
        sec.classList.remove('homeui-sec-hidden');
        Array.prototype.forEach.call(rows, function(r) {
          r.style.display = '';
        });
        return;
      }

      var titleMatch = (sec.dataset.homeuiTitle || '').toLowerCase().includes(q) ||
        (sec.dataset.homeuiTableTitle || '').toLowerCase().includes(q);
      var visibleRows = 0;
      Array.prototype.forEach.call(rows, function(r) {
        if (r.classList.contains('cbi-section-table-titles') ||
            r.classList.contains('table-titles'))
          return;
        var rTxt = r.textContent.toLowerCase();
        var show = titleMatch || rTxt.includes(q);
        r.style.display = show ? '' : 'none';
        if (show)
          visibleRows++;
      });

      sec.classList.toggle('homeui-sec-hidden', visibleRows === 0 && !titleMatch);
    });

    Array.prototype.forEach.call(
      view.querySelectorAll('.nft-table, .homeui-routes-tabpane, .cbi-section'),
      function(parentSec) {
        if (parentSec.classList.contains('homeui-fw-unit') ||
            parentSec.classList.contains('homeui-nft-table-head'))
          return;
        var childUnits = parentSec.querySelectorAll('.homeui-fw-unit');
        if (!childUnits.length)
          return;
        var anyVisible = Array.prototype.some.call(childUnits, function(u) {
          return !u.classList.contains('homeui-sec-hidden');
        });
        parentSec.classList.toggle('homeui-sec-hidden', !anyVisible);
      }
    );
  }

  function getCellText(container, selector)
  {
    if (!container)
      return '';
    var el = container.querySelector(selector);
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function parseSizeStringToBytes(str)
  {
    if (!str)
      return 0;
    var m = String(str).match(/([\d.]+)\s*([KMGTPE]?i?B)/i);
    if (!m)
      return 0;
    var val = parseFloat(m[1]);
    if (isNaN(val))
      return 0;
    var unit = m[2].toUpperCase();
    if (unit.indexOf('T') === 0)
      return val * 1024 * 1024 * 1024 * 1024;
    if (unit.indexOf('G') === 0)
      return val * 1024 * 1024 * 1024;
    if (unit.indexOf('M') === 0)
      return val * 1024 * 1024;
    if (unit.indexOf('K') === 0)
      return val * 1024;
    return val;
  }

  function readFormFieldText(view, namePattern, fallback)
  {
    var row = view.querySelector('.cbi-value[data-name="' + namePattern + '"]');
    if (!row) {
      var rows = view.querySelectorAll('.cbi-value[data-name]');
      for (var i = 0; i < rows.length; i++) {
        if ((rows[i].getAttribute('data-name') || '').indexOf(namePattern) !== -1) {
          row = rows[i];
          break;
        }
      }
    }
    if (!row)
      return fallback;

    var sel = row.querySelector('select');
    if (sel) {
      var opt = sel.options[sel.selectedIndex];
      var txt = opt ? (opt.textContent || opt.value || '').trim() : (sel.value || '').trim();
      return txt || fallback;
    }

    var ddItem = row.querySelector('.cbi-dropdown > ul > li[selected], .cbi-dropdown > ul > li[display]');
    if (ddItem) {
      var dTxt = ddItem.textContent.trim();
      if (dTxt)
        return dTxt;
    }

    var inp = row.querySelector('input:not([type="checkbox"]):not([type="radio"])');
    if (inp && inp.value)
      return inp.value.trim();

    return fallback;
  }

  function enhanceModal(modal)
  {
    if (!modal)
      return;

    var head = modal.querySelector('h4, h3, .modal-header');
    if (!modal.querySelector('.homeui-modal-close-btn')) {
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'homeui-modal-close-btn';
      closeBtn.title = isChinese ? '关闭' : 'Close';
      closeBtn.setAttribute('aria-label', closeBtn.title);
      closeBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M18 6 6 18M6 6l12 12"/>' +
        '</svg>';

      closeBtn.addEventListener('click', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var cancelBtn = modal.querySelector(
          '.right button:not(.cbi-button-positive):not(.cbi-button-action):not(.cbi-button-save):not(.important), ' +
          '.button-row button:not(.important):not(.cbi-button-positive), ' +
          '.cbi-page-actions button:not(.cbi-button-positive):not(.cbi-button-save)'
        );
        if (cancelBtn) {
          cancelBtn.click();
        } else if (window.L && window.L.ui && typeof window.L.ui.hideModal === 'function') {
          window.L.ui.hideModal();
        } else {
          var ov = modal.closest('#modal_overlay') || modal;
          ov.remove();
        }
      });

      if (head) {
        head.style.position = 'relative';
        head.appendChild(closeBtn);
      } else {
        modal.insertBefore(closeBtn, modal.firstChild);
      }
    }

    var btnBar = modal.querySelector('.right, .button-row, .cbi-page-actions');
    if (btnBar)
      btnBar.classList.add('homeui-modal-actions');

    enhanceAllSelects(modal);
  }

  function enhanceSelect(sel)
  {
    if (!sel || sel.nodeType !== 1 || sel.tagName !== 'SELECT')
      return;
    if (sel.hasAttribute('data-homeui-enhanced'))
      return;
    if (sel.multiple || (sel.size && sel.size > 1))
      return;
    if (sel.closest('.cbi-dropdown'))
      return;

    sel.setAttribute('data-homeui-enhanced', 'true');
    var inCell = !!sel.closest('td, .td, .cbi-section-table-cell');
    sel.style.display = 'none';

    var dd = document.createElement('div');
    dd.className = 'cbi-dropdown homeui-select-enhanced' + (inCell ? ' in-table-cell' : '');
    dd.tabIndex = -1;
    if (sel.disabled)
      dd.setAttribute('disabled', '');

    function renderClosed() {
      dd.classList.remove('is-dropup');
      dd.removeAttribute('open');
      var cur = dd.parentElement;
      while (cur && cur !== document.body) {
        if (cur.classList && (cur.classList.contains('cbi-value') || cur.classList.contains('cbi-value-field') || cur.classList.contains('cbi-section') || cur.classList.contains('cbi-section-node') || cur.classList.contains('table') || cur.classList.contains('cbi-section-table') || cur.classList.contains('tr') || cur.classList.contains('td') || cur.tagName === 'TR' || cur.tagName === 'TD' || cur.tagName === 'TABLE')) {
          cur.classList.remove('cbi-dropdown-open');
        }
        cur = cur.parentElement;
      }
      dd.innerHTML = '';
      var ul = document.createElement('ul');
      var opts = sel.options || [];
      for (var i = 0; i < opts.length; i++) {
        var opt = opts[i];
        var li = document.createElement('li');
        li.setAttribute('data-value', opt.value);
        li.textContent = opt.textContent || opt.text || '';
        if (opt.selected) {
          li.setAttribute('selected', '');
          li.setAttribute('display', '0');
        }
        ul.appendChild(li);
      }
      dd.appendChild(ul);
      var spanOpen = document.createElement('span');
      spanOpen.className = 'open';
      spanOpen.tabIndex = -1;
      dd.appendChild(spanOpen);
    }

    function renderOpen() {
      dd.innerHTML = '';
      var opts = sel.options || [];

      var ulDropdown = document.createElement('ul');
      ulDropdown.className = 'dropdown';

      var ulPreview = document.createElement('ul');
      ulPreview.className = 'preview';

      for (var i = 0; i < opts.length; i++) {
        var opt = opts[i];
        var isSel = opt.selected;

        var liPrev = document.createElement('li');
        liPrev.setAttribute('data-value', opt.value);
        liPrev.textContent = opt.textContent || opt.text || '';
        if (isSel) {
          liPrev.setAttribute('selected', '');
          liPrev.setAttribute('display', '0');
        }
        ulPreview.appendChild(liPrev);

        var li = document.createElement('li');
        li.setAttribute('data-value', opt.value);
        li.textContent = opt.textContent || opt.text || '';
        if (isSel)
          li.setAttribute('selected', '');

        (function(val) {
          li.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sel.value = val;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            renderClosed();
          });
        })(opt.value);

        ulDropdown.appendChild(li);
      }

      dd.appendChild(ulDropdown);
      dd.appendChild(ulPreview);

      var spanOpen = document.createElement('span');
      spanOpen.className = 'open';
      spanOpen.tabIndex = -1;
      dd.appendChild(spanOpen);

      dd.setAttribute('open', '');
      var cur = dd.parentElement;
      while (cur && cur !== document.body) {
        if (cur.classList && (cur.classList.contains('cbi-value') || cur.classList.contains('cbi-value-field') || cur.classList.contains('cbi-section') || cur.classList.contains('cbi-section-node') || cur.classList.contains('table') || cur.classList.contains('cbi-section-table') || cur.classList.contains('tr') || cur.classList.contains('td') || cur.tagName === 'TR' || cur.tagName === 'TD' || cur.tagName === 'TABLE')) {
          cur.classList.add('cbi-dropdown-open');
        }
        cur = cur.parentElement;
      }

      var rect = dd.getBoundingClientRect();
      var spaceBelow = window.innerHeight - rect.bottom;
      var spaceAbove = rect.top;
      if (spaceBelow < 180 && spaceAbove > spaceBelow) {
        dd.classList.add('is-dropup');
        ulDropdown.classList.add('is-dropup');
      } else {
        dd.classList.remove('is-dropup');
        ulDropdown.classList.remove('is-dropup');
      }
    }

    dd.addEventListener('click', function(e) {
      if (dd.hasAttribute('disabled'))
        return;
      if (e.target.closest('ul.dropdown'))
        return;
      if (dd.hasAttribute('open')) {
        renderClosed();
      } else {
        document.querySelectorAll('.cbi-dropdown.homeui-select-enhanced[open]').forEach(function(o) {
          if (o !== dd) {
            if (typeof o._renderClosed === 'function')
              o._renderClosed();
            else
              o.removeAttribute('open');
          }
        });
        renderOpen();
      }
    });

    dd._renderClosed = renderClosed;

    sel.addEventListener('change', function() {
      renderClosed();
    });

    var selObs = new MutationObserver(function() {
      if (sel.disabled)
        dd.setAttribute('disabled', '');
      else
        dd.removeAttribute('disabled');
      if (!dd.hasAttribute('open'))
        renderClosed();
    });
    selObs.observe(sel, { childList: true, attributes: true, attributeFilter: ['disabled'] });

    renderClosed();
    if (sel.parentNode)
      sel.parentNode.insertBefore(dd, sel.nextSibling);
  }

  function enhanceAllSelects(rootEl)
  {
    var container = rootEl || document.body;
    if (!container)
      return;
    var selects = container.querySelectorAll('select:not([data-homeui-enhanced])');
    for (var i = 0; i < selects.length; i++) {
      enhanceSelect(selects[i]);
    }
  }

  function getPageTitle(main)
  {
    var selectors = [
      ':scope > h2',
      ':scope > #view > h2',
      ':scope > .cbi-map > h2:first-child',
      ':scope > #view > .cbi-map > h2:first-child',
      ':scope > #view > div > h2:first-child',
      ':scope > #view h2:first-of-type'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var heading = main.querySelector(selectors[i]);
      var text = heading ? heading.textContent.trim() : '';
      if (text)
        return text;
    }

    var activeMenu = document.querySelector(
      '#sidemenu li.active > a, #sidemenu li.selected > a, ' +
      '#topmenu li.active > a, #topmenu li.selected > a'
    );
    if (activeMenu && activeMenu.textContent.trim())
      return activeMenu.textContent.trim();

    return document.title
      .replace(/\s*[-|]\s*(?:LuCI|HomeUI).*$/i, '')
      .trim();
  }

  function getPageTabSource(main)
  {
    var current = main._homeuiPageTabSource;
    if (current && current.isConnected)
      return current;

    var candidates = main.querySelectorAll('.tabs, .cbi-tabmenu');
    var nested = null;

    for (var i = 0; i < candidates.length; i++) {
      var tabs = candidates[i];
      if (tabs.classList.contains('homeui-page-tabs-source') ||
          tabs.closest('.modal, .cbi-modal, #modal_overlay') ||
          !tabs.querySelector('li > a, li > button')) {
        continue;
      }

      if (window.getComputedStyle(tabs).display === 'none')
        continue;

      if (!tabs.closest('.cbi-section')) {
        main._homeuiPageTabSource = tabs;
        return tabs;
      }

      if (!nested)
        nested = tabs;
    }

    main._homeuiPageTabSource = nested;
    return nested;
  }

  function getPageTabSignature(tabs)
  {
    if (!tabs)
      return '';

    var labels = [];
    var controls = tabs.querySelectorAll(
      ':scope > li > a, :scope > li > button'
    );
    Array.prototype.forEach.call(controls, function(control) {
      var label = control.textContent.replace(/\s+/g, ' ').trim();
      if (label)
        labels.push(label);
    });

    return labels.join('|');
  }

  function isPageTabActive(item, control)
  {
    if (item.classList.contains('active') ||
        item.classList.contains('cbi-tab-active') ||
        (item.classList.contains('cbi-tab') &&
         !item.classList.contains('cbi-tab-disabled')) ||
        control.getAttribute('aria-current') === 'page' ||
        control.getAttribute('aria-selected') === 'true') {
      return true;
    }

    var href = control.getAttribute('href');
    if (!href || href.charAt(0) === '#' ||
        href.toLowerCase().indexOf('javascript:') === 0) {
      return false;
    }

    try {
      var target = new URL(href, window.location.href);
      return target.pathname === window.location.pathname &&
        target.search === window.location.search;
    } catch (e) {
      return false;
    }
  }

  function bindPageTab(button, control, main, pageId)
  {
    button.addEventListener('click', function() {
      var buttons = button.parentNode.querySelectorAll(
        '.homeui-page-tab'
      );
      Array.prototype.forEach.call(buttons, function(tab) {
        tab.classList.remove('is-active');
        tab.setAttribute('aria-selected', 'false');
      });
      button.classList.add('is-active');
      button.setAttribute('aria-selected', 'true');
      control.click();
      window.requestAnimationFrame(function() {
        normalizePageLayout(main, pageId);
      });
    });
  }

  function buildPageChrome(main, source, title, pageId)
  {
    var items = [];
    if (source) {
      var sourceItems = source.querySelectorAll(':scope > li');
      Array.prototype.forEach.call(sourceItems, function(item) {
        var control = item.querySelector(
          ':scope > a, :scope > button'
        );
        var label = control ?
          control.textContent.replace(/\s+/g, ' ').trim() : '';
        if (control && label) {
          items.push({
            control: control,
            label: label,
            active: isPageTabActive(item, control)
          });
        }
      });
    }

    if (!items.length && title)
      items.push({ control: null, label: title, active: true });
    if (!items.length)
      return;

    var signature = items.map(function(item) {
      return item.label + ':' + (item.active ? '1' : '0');
    }).join('|');
    var chrome = main.querySelector(':scope > .homeui-page-chrome');

    if (!chrome) {
      chrome = document.createElement('nav');
      chrome.className = 'homeui-page-chrome';
      chrome.setAttribute(
        'aria-label',
        isChinese ? '页面导航' : 'Page navigation'
      );
      main.insertBefore(chrome, main.firstChild);
    } else if (main.firstElementChild !== chrome) {
      main.insertBefore(chrome, main.firstChild);
    }

    if (chrome.dataset.signature === signature &&
        chrome._homeuiSource === source) {
      return;
    }

    chrome.dataset.signature = signature;
    chrome._homeuiSource = source;
    chrome.textContent = '';
    var rail = document.createElement('div');
    rail.className = 'homeui-page-tabs';
    rail.setAttribute('role', 'tablist');
    chrome.appendChild(rail);

    items.forEach(function(item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'homeui-page-tab';
      button.textContent = item.label;
      button.setAttribute('role', 'tab');
      button.setAttribute(
        'aria-selected',
        item.active ? 'true' : 'false'
      );
      if (item.active)
        button.classList.add('is-active');
      if (!item.control)
        button.disabled = true;
      else
        bindPageTab(button, item.control, main, pageId);
      rail.appendChild(button);
    });
  }

  function removePageChrome(main)
  {
    var chrome = main.querySelector(':scope > .homeui-page-chrome');
    if (chrome)
      chrome.remove();
  }

  function isSpecializedPage(pageId)
  {
    var prefixes = [
      'admin-status-routes',
      'admin-status-nftables',
      'admin-status-iptables',
      'admin-status-realtime',
      'admin-status-wireguard',
      'admin-status-logs',
      'admin-status-syslog',
      'admin-status-dmesg',
      'admin-status-processes'
    ];

    return prefixes.some(function(prefix) {
      return (pageId || '').indexOf(prefix) === 0;
    });
  }

  function normalizePageLayout(view, pageId)
  {
    var main = document.querySelector('#maincontent');
    if (!main || pageId === 'admin-status-overview' ||
        main.querySelector('.homeui-login-shell')) {
      return;
    }

    main.classList.add('homeui-unified-page');
    main.classList.toggle(
      'homeui-specialized-page',
      isSpecializedPage(pageId)
    );
    var title = getPageTitle(main);
    var source = getPageTabSource(main);
    if (source) {
      source.classList.add('homeui-page-tabs-source');
      source.classList.remove('homeui-page-tabs-duplicate');
      source.classList.remove('homeui-section-tabs');
    }

    var titleSources = main.querySelectorAll(
      ':scope > h2, :scope > #view > h2, ' +
      ':scope > .cbi-map > h2:first-child, ' +
      ':scope > #view > .cbi-map > h2:first-child, ' +
      ':scope > #view > div > h2:first-child, ' +
      ':scope > #view h2:first-of-type'
    );
    Array.prototype.forEach.call(titleSources, function(heading) {
      heading.classList.add('homeui-page-title-source');
    });

    var sourceSignature = getPageTabSignature(source);
    var tabLists = main.querySelectorAll('.tabs, .cbi-tabmenu');
    Array.prototype.forEach.call(tabLists, function(tabs) {
      if (tabs === source ||
          tabs.closest('.modal, .cbi-modal, #modal_overlay'))
        return;

      tabs.classList.remove('homeui-page-tabs-duplicate');
      if (sourceSignature &&
          getPageTabSignature(tabs) === sourceSignature) {
        tabs.classList.add('homeui-page-tabs-duplicate');
        tabs.classList.remove('homeui-section-tabs');
        return;
      }

      tabs.classList.add('homeui-section-tabs');
    });

    var descriptions = main.querySelectorAll(
      ':scope > .cbi-map-descr, ' +
      ':scope > #view > .cbi-map-descr, ' +
      ':scope > .cbi-map > .cbi-map-descr, ' +
      ':scope > #view > .cbi-map > .cbi-map-descr'
    );
    Array.prototype.forEach.call(descriptions, function(description) {
      description.classList.add('homeui-page-description');
      description.classList.toggle(
        'homeui-empty-description',
        !description.textContent.trim()
      );
    });

    if (pageId === 'admin-status-routes' ||
        (!source && main.querySelector('.homeui-subpage-tabs')))
      removePageChrome(main);
    else
      buildPageChrome(main, source, title, pageId);
  }

  function observeModals()
  {
    var activeDropdown = null;
    var dropdownFrame = 0;

    function clearDropdownPosition(dropdown)
    {
      if (!dropdown)
        return;

      var list = dropdown.querySelector('ul.dropdown');
      dropdown.classList.remove('homeui-dropdown-floating');
      if (!list)
        return;

      list.classList.remove('is-dropup');
      [
        'position',
        'left',
        'right',
        'top',
        'bottom',
        'width',
        'min-width',
        'max-width',
        'max-height',
        'margin-top',
        'margin-bottom'
      ].forEach(function(name) {
        list.style.removeProperty(name);
      });
    }

    function positionDropdown(dropdown)
    {
      if (!dropdown)
        return;
      if (!dropdown.isConnected) {
        if (activeDropdown === dropdown)
          activeDropdown = null;
        return;
      }
      if (!dropdown.hasAttribute('open'))
        return;

      var list = dropdown.querySelector('ul.dropdown');
      if (!list)
        return;

      var rect = dropdown.getBoundingClientRect();
      var viewportWidth = document.documentElement.clientWidth;
      var viewportHeight = document.documentElement.clientHeight;
      var margin = 8;
      var gap = 4;
      var availableWidth = Math.max(160, viewportWidth - margin * 2);
      var listWidth = Math.min(availableWidth, Math.max(160, rect.width));
      var left = Math.min(
        Math.max(margin, rect.left),
        Math.max(margin, viewportWidth - listWidth - margin)
      );
      var spaceBelow = viewportHeight - rect.bottom - margin - gap;
      var spaceAbove = rect.top - margin - gap;
      var dropUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      var availableHeight = dropUp ? spaceAbove : spaceBelow;
      var maxHeight = Math.max(96, Math.min(240, availableHeight));

      dropdown.classList.add('homeui-dropdown-floating');
      dropdown.classList.toggle('is-dropup', dropUp);
      list.classList.toggle('is-dropup', dropUp);
      list.style.setProperty('position', 'fixed', 'important');
      list.style.setProperty('left', left + 'px', 'important');
      list.style.setProperty('right', 'auto', 'important');
      list.style.setProperty('width', listWidth + 'px', 'important');
      list.style.setProperty('min-width', rect.width + 'px', 'important');
      list.style.setProperty('max-width', availableWidth + 'px', 'important');
      list.style.setProperty('max-height', maxHeight + 'px', 'important');
      list.style.setProperty('margin-top', '0', 'important');
      list.style.setProperty('margin-bottom', '0', 'important');

      if (dropUp) {
        list.style.setProperty('top', 'auto', 'important');
        list.style.setProperty(
          'bottom',
          viewportHeight - rect.top + gap + 'px',
          'important'
        );
      } else {
        list.style.setProperty(
          'top',
          rect.bottom + gap + 'px',
          'important'
        );
        list.style.setProperty('bottom', 'auto', 'important');
      }

      activeDropdown = dropdown;
    }

    function scheduleDropdownPosition()
    {
      if (!activeDropdown || dropdownFrame)
        return;

      dropdownFrame = window.requestAnimationFrame(function() {
        dropdownFrame = 0;
        positionDropdown(activeDropdown);
      });
    }

    var scan = function() {
      var list = document.querySelectorAll('.modal, .cbi-modal, #modal_overlay > div');
      Array.prototype.forEach.call(list, function(m) {
        enhanceModal(m);
        enhanceAllSelects(m);
      });
      enhanceAllSelects(document.body);
    };

    new MutationObserver(function(mutations) {
      var hasModal = mutations.some(function(m) {
        return m.target.id === 'modal_overlay' ||
          (m.target.closest && m.target.closest('#modal_overlay, .modal, .cbi-modal')) ||
          Array.prototype.some.call(m.addedNodes || [], function(n) {
            return n.nodeType === 1 && (
              n.id === 'modal_overlay' ||
              n.tagName === 'SELECT' ||
              n.classList.contains('modal') ||
              n.classList.contains('cbi-modal') ||
              (n.querySelector && n.querySelector('.modal, .cbi-modal, #modal_overlay, select'))
            );
          });
      });
      if (hasModal)
        scan();
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', function(ev) {
      if (ev.key === 'Escape' || ev.keyCode === 27) {
        var activeModal = document.querySelector('.modal, .cbi-modal, #modal_overlay');
        if (activeModal) {
          var btn = activeModal.querySelector('.homeui-modal-close-btn');
          if (btn)
            btn.click();
        }
      }
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.cbi-dropdown')) {
        document.querySelectorAll('.cbi-dropdown.homeui-select-enhanced[open]').forEach(function(d) {
          if (typeof d._renderClosed === 'function')
            d._renderClosed();
          else
            d.removeAttribute('open');
        });
        document.querySelectorAll('.cbi-dropdown-open').forEach(function(el) {
          if (!el.querySelector('.cbi-dropdown[open]'))
            el.classList.remove('cbi-dropdown-open');
        });
      }
    });

    var ddObserver = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'open' && m.target) {
          if (m.target.hasAttribute('open')) {
            if (activeDropdown && activeDropdown !== m.target)
              clearDropdownPosition(activeDropdown);
            positionDropdown(m.target);
          } else {
            clearDropdownPosition(m.target);
            if (activeDropdown === m.target)
              activeDropdown = null;
          }
        }
      }
    });
    ddObserver.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['open']
    });

    window.addEventListener('resize', function() {
      scheduleDropdownPosition();
    });

    document.addEventListener('scroll', function() {
      scheduleDropdownPosition();
    }, true);

    scan();
  }

  observeModals();

  window.HomeUI = {
    root: root,
    collapseButton: collapseButton,
    colorButton: colorButton,
    colorLabel: colorLabel,
    topMenu: topMenu,
    indicators: indicators,
    searchTrigger: searchTrigger,
    darkQuery: darkQuery,
    isChinese: isChinese,
    resolveCurrentPageId: resolveCurrentPageId,
    pageId: pageId,
    isOverview: isOverview,
    isRoutesPage: isRoutesPage,
    isFirewallStatusPage: isFirewallStatusPage,
    isRealtimePage: isRealtimePage,
    isWireguardPage: isWireguardPage,
    isSystemPage: isSystemPage,
    isLogsPage: isLogsPage,
    isProcessesPage: isProcessesPage,
    isNetworkPage: isNetworkPage,
    isFirewallPage: isFirewallPage,
    chartState: chartState,
    subpageState: subpageState,
    liveState: liveState,
    SHORTCUT_CATALOG: SHORTCUT_CATALOG,
    DEFAULT_SHORTCUT_IDS: DEFAULT_SHORTCUT_IDS,
    pad2: pad2,
    buildUrl: buildUrl,
    applyColorMode: applyColorMode,
    setSidebarCollapsed: setSidebarCollapsed,
    toggleSidebar: toggleSidebar,
    expandSidebarOnMenuClick: expandSidebarOnMenuClick,
    labelIndicators: labelIndicators,
    openSearchModal: openSearchModal,
    renderSearchResults: renderSearchResults,
    formatBytes: formatBytes,
    formatRate: formatRate,
    formatRateKB: formatRateKB,
    formatUptimeChinese: formatUptimeChinese,
    formatUnixLocalTime: formatUnixLocalTime,
    escapeHtml: escapeHtml,
    setText: setText,
    getSectionHeadingText: getSectionHeadingText,
    countValidSectionRows: countValidSectionRows,
    applySubpageFilter: applySubpageFilter,
    getCellText: getCellText,
    parseSizeStringToBytes: parseSizeStringToBytes,
    readFormFieldText: readFormFieldText,
    enhanceModal: enhanceModal,
    observeModals: observeModals,
    enhanceSelect: enhanceSelect,
    enhanceAllSelects: enhanceAllSelects,
    normalizePageLayout: normalizePageLayout
  };
})(window);
