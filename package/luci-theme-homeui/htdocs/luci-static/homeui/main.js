(function() {
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
    else if (/admin-status-realtime/.test(bodyPage) &&
             bodyPage.indexOf('admin-status-realtime') !== 0) {
      var rtMatch = bodyPage.match(/admin-status-realtime(?:-[a-z0-9_]+)?/i);
      bodyPage = rtMatch ? rtMatch[0] : 'admin-status-realtime';
    }
    else if (/admin-status-overview/.test(bodyPage))
      bodyPage = 'admin-status-overview';

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
  var isStandalonePage =
    isOverview ||
    pageId === 'admin-status-processes' ||
    pageId === 'admin-status-logs' ||
    pageId === 'admin-status-syslog' ||
    pageId === 'admin-system-system';

  if (isStandalonePage)
    root.classList.add('homeui-overview-single-rail');

  var chartState = {
    rateStat: 'avg',
    rateIface: 'all',
    rateRange: '1h',
    clientStat: 'avg',
    clientType: 'wired',
    clientRange: '1h',
    memStat: 'avg',
    memRange: '1h',
    bottomTab: 'leases'
  };

  var subpageState = {
    routesTab: 'all',
    routesQuery: '',
    fwTab: 'all',
    fwHideEmpty: true,
    fwQuery: '',
    wgTab: 'all',
    wgQuery: ''
  };

  var liveState = {
    lastTick: 0,
    pollTicks: 0,
    devCounters: {},
    wanWaves: {},
    ifaces: [],
    selectedWanIdx: 0,
    totalRxSpeed: 0,
    totalTxSpeed: 0,
    totalBytes: 0,
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

  var historyState = loadHistoryState();

  function pad2(n)
  {
    return n < 10 ? '0' + n : String(n);
  }

  function createEmptyRangeSeries()
  {
    return {
      bucketSlot: 0,
      txAvg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      txPeak: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      rxAvg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      rxPeak: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ifaceSeries: {},
      latency: [12, 12, 11, 12, 13, 12, 12, 11, 12, 12, 12, 12],
      wiredAvg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wiredPeak: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wirelessAvg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wirelessPeak: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      memAvg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      memPeak: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      seeded: false
    };
  }

  function loadHistoryState()
  {
    try {
      var raw = localStorage.getItem('homeui-overview-history-v4');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.h1 && parsed.h24 &&
            Array.isArray(parsed.h1.txAvg) && parsed.h1.txAvg.length === 12)
          return parsed;
      }
    } catch (e) {}

    return {
      h1: createEmptyRangeSeries(),
      h24: createEmptyRangeSeries()
    };
  }

  function saveHistoryState()
  {
    try {
      localStorage.setItem(
        'homeui-overview-history-v4',
        JSON.stringify(historyState)
      );
    } catch (e) {}
  }

  function getAxisLabels(range)
  {
    var now = Date.now();
    var stepMs = range === '24h' ? 2 * 3600 * 1000 : 5 * 60 * 1000;
    var labels = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now - i * stepMs);
      labels.push(pad2(d.getHours()) + ':' + pad2(d.getMinutes()));
    }
    return labels;
  }

  function buildUrl(path)
  {
    if (window.L && typeof window.L.url === 'function')
      return window.L.url.apply(window.L, path.split('/'));
    return '/cgi-bin/luci/' + path;
  }

  function getSelectedShortcutIds()
  {
    try {
      var raw = localStorage.getItem('homeui-shortcuts-v2');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length)
          return parsed;
      }
    } catch (e) {}
    return DEFAULT_SHORTCUT_IDS.slice();
  }

  function saveSelectedShortcutIds(ids)
  {
    try {
      localStorage.setItem('homeui-shortcuts-v2', JSON.stringify(ids));
    } catch (e) {}
  }

  function getFullShortcutCatalog()
  {
    var list = SHORTCUT_CATALOG.map(function(item) {
      return {
        id: item.id,
        title: isChinese ? item.zh : item.en,
        href: buildUrl(item.path),
        icon: item.icon
      };
    });

    var knownPaths = {};
    list.forEach(function(it) {
      knownPaths[it.href] = true;
    });

    if (Array.isArray(window.__homeuiMenuItems)) {
      window.__homeuiMenuItems.forEach(function(m) {
        if (!m || !m.href || knownPaths[m.href])
          return;
        knownPaths[m.href] = true;
        list.push({
          id: 'menu_' + m.href.replace(/[^a-zA-Z0-9_-]/g, '_'),
          title: m.title,
          href: m.href,
          icon: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
        });
      });
    }

    return list;
  }

  function renderQuickGrid(dash)
  {
    if (!dash)
      return;
    var grid = dash.querySelector('[data-quick-grid]');
    if (!grid)
      return;

    var catalog = getFullShortcutCatalog();
    var selectedIds = getSelectedShortcutIds();
    var map = {};
    catalog.forEach(function(item) {
      map[item.id] = item;
    });

    var chosen = [];
    selectedIds.forEach(function(id) {
      if (map[id])
        chosen.push(map[id]);
    });

    if (!chosen.length) {
      chosen = catalog.slice(0, 9);
    }

    grid.innerHTML = chosen.map(function(item) {
      return '<a class="homeui-quick-item" href="' + item.href + '">' +
        '<span class="homeui-quick-icon"><svg viewBox="0 0 24 24">' +
          item.icon + '</svg></span>' +
        '<span class="homeui-quick-label">' + item.title + '</span>' +
      '</a>';
    }).join('');
  }

  function openShortcutModal(dash)
  {
    var existing = document.querySelector('#homeui-shortcut-modal');
    if (existing)
      existing.remove();

    var catalog = getFullShortcutCatalog();
    var selectedSet = {};
    getSelectedShortcutIds().forEach(function(id) {
      selectedSet[id] = true;
    });

    var modal = document.createElement('div');
    modal.id = 'homeui-shortcut-modal';
    modal.className = 'homeui-shortcut-modal';

    function renderOptionsHtml()
    {
      return catalog.map(function(item) {
        var sel = !!selectedSet[item.id];
        return '<div class="homeui-shortcut-option' +
          (sel ? ' is-selected' : '') + '" data-sc-id="' + item.id + '">' +
          '<svg viewBox="0 0 24 24">' + item.icon + '</svg>' +
          '<span>' + item.title + '</span>' +
          '<i class="homeui-shortcut-check">✓</i>' +
        '</div>';
      }).join('');
    }

    modal.innerHTML =
      '<div class="homeui-shortcut-dialog" role="dialog" aria-modal="true">' +
        '<div class="homeui-shortcut-head">' +
          '<h4>' +
            (isChinese ? '自定义快捷入口' : 'Customize Quick Access') +
          '</h4>' +
          '<button type="button" class="homeui-shortcut-close" data-sc-close>×</button>' +
        '</div>' +
        '<div class="homeui-shortcut-body">' +
          '<p class="homeui-shortcut-tip">' +
            (isChinese ?
              '点击选择需要在系统概况页展示的快捷入口（支持多选，每行展示 3 个）：' :
              'Select the shortcuts to display in the Quick Access grid:') +
          '</p>' +
          '<div class="homeui-shortcut-picker" data-sc-picker>' +
            renderOptionsHtml() +
          '</div>' +
        '</div>' +
        '<div class="homeui-shortcut-foot">' +
          '<button type="button" class="btn" data-sc-reset>' +
            (isChinese ? '恢复默认' : 'Reset Default') +
          '</button>' +
          '<div class="homeui-shortcut-actions">' +
            '<button type="button" class="btn" data-sc-close>' +
              (isChinese ? '取消' : 'Cancel') +
            '</button>' +
            '<button type="button" class="btn cbi-button-positive" data-sc-save>' +
              (isChinese ? '保存设置' : 'Save') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    var picker = modal.querySelector('[data-sc-picker]');
    picker.addEventListener('click', function(ev) {
      var opt = ev.target.closest('[data-sc-id]');
      if (!opt)
        return;
      var id = opt.dataset.scId;
      if (selectedSet[id]) {
        delete selectedSet[id];
        opt.classList.remove('is-selected');
      } else {
        selectedSet[id] = true;
        opt.classList.add('is-selected');
      }
    });

    modal.addEventListener('click', function(ev) {
      if (ev.target === modal || ev.target.closest('[data-sc-close]'))
        modal.remove();
    });

    var resetBtn = modal.querySelector('[data-sc-reset]');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        selectedSet = {};
        DEFAULT_SHORTCUT_IDS.forEach(function(id) {
          selectedSet[id] = true;
        });
        picker.innerHTML = renderOptionsHtml();
      });
    }

    var saveBtn = modal.querySelector('[data-sc-save]');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var newIds = Object.keys(selectedSet);
        if (!newIds.length)
          newIds = DEFAULT_SHORTCUT_IDS.slice();
        saveSelectedShortcutIds(newIds);
        renderQuickGrid(dash);
        modal.remove();
      });
    }
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

  function getOverviewSectionName(section, fallback)
  {
    var heading = section.querySelector('h3, h4, .cbi-section-title, .cbi-title');
    var title = '';
    if (heading) {
      var clone = heading.cloneNode(true);
      Array.prototype.forEach.call(
        clone.querySelectorAll('button, a'),
        function(b) { b.remove(); }
      );
      title = clone.textContent.replace(/隐藏|显示|hide|show/gi, '').trim().toLowerCase();
    }

    var rules = [
      ['memory', /内存|memory/],
      ['storage', /存储|磁盘|挂载|storage|mount|disk/],
      ['ports', /端口|以太网|port|ethernet/],
      ['dhcp6', /dhcpv6|ipv6.*租约|ipv6.*lease/],
      ['dhcp', /dhcp|租约|lease/],
      ['dns', /dns/],
      ['dsl', /dsl/],
      ['wifi', /wifi|wireless|无线|站点|station/],
      ['network', /网络|接口|network|interface/],
      ['system', /系统|概览|system/]
    ];

    for (var i = 0; i < rules.length; i++) {
      if (rules[i][1].test(title))
        return rules[i][0];
    }

    return fallback;
  }

  function getRowData(section, patterns)
  {
    if (!section)
      return { text: '--', title: '', percent: null };

    var rows = section.querySelectorAll('.tr, tr');
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('.td, td');
      var label = cells.length ? cells[0].textContent.trim() : '';

      var matched = patterns.some(function(pattern) {
        return pattern.test(label);
      });

      if (!matched || cells.length < 2)
        continue;

      var lastCell = cells[cells.length - 1];
      var progress = lastCell.querySelector('.cbi-progressbar');
      var text = lastCell.textContent.trim();
      var title = progress ? (progress.getAttribute('title') || '') : '';
      var pct = null;

      if (title) {
        var m = title.match(/\((\d+(?:\.\d+)?)%\)/);
        if (m)
          pct = parseFloat(m[1]);
      }

      if (pct === null && text) {
        var tm = text.match(/(\d+(?:\.\d+)?)\s*%/);
        if (tm)
          pct = parseFloat(tm[1]);
      }

      return {
        text: text || title || '--',
        title: title,
        percent: pct
      };
    }

    return { text: '--', title: '', percent: null };
  }

  function extractAllKeyValues(section)
  {
    var list = [];
    if (!section)
      return list;

    var rows = section.querySelectorAll('.tr, tr');
    Array.prototype.forEach.call(rows, function(row) {
      if (row.classList.contains('table-titles'))
        return;
      var cells = row.querySelectorAll('.td, td');
      if (cells.length < 2)
        return;
      var k = cells[0].textContent.trim();
      var last = cells[cells.length - 1];
      var prog = last.querySelector('.cbi-progressbar');
      var v = (prog && prog.getAttribute('title')) || last.textContent.trim();
      var pct = null;
      if (v) {
        var m = v.match(/(\d+(?:\.\d+)?)\s*%/);
        if (m)
          pct = parseFloat(m[1]);
      }
      if (k && v)
        list.push({ key: k, value: v, percent: pct });
    });
    return list;
  }

  function extractLeaseRows(sectionsList)
  {
    var leases = [];
    sectionsList.forEach(function(secObj) {
      if (!secObj || !secObj.el)
        return;
      var rows = secObj.el.querySelectorAll('.table .tr:not(.table-titles), table tr');
      Array.prototype.forEach.call(rows, function(row) {
        var tds = row.querySelectorAll('.td, td');
        if (tds.length < 3)
          return;
        var c0 = tds[0].textContent.trim();
        var c1 = tds[1].textContent.trim();
        var c2 = tds[2].textContent.trim();
        var c3 = tds[3] ? tds[3].textContent.trim() : '--';
        if (!c0 && !c1)
          return;
        if (/没有|无|no\s+active|empty/i.test(c0))
          return;
        leases.push({
          hostname: c0 || '*',
          ip: c1 || '--',
          mac: c2 || '--',
          expires: c3 || '--',
          type: secObj.type || (isChinese ? '有线' : 'Wired')
        });
      });
    });
    return leases;
  }

  function parseIfaceBox(box, fallbackName)
  {
    var head = box.querySelector('.ifacebox-head');
    var body = box.querySelector('.ifacebox-body');
    var title = head ? head.textContent.trim() : (fallbackName || 'WAN');
    var active = head ? head.classList.contains('active') : true;
    var map = {};

    if (body) {
      var infoSpan = body.querySelector('span') || body;
      var strongs = infoSpan.querySelectorAll('strong');
      Array.prototype.forEach.call(strongs, function(st) {
        var key = st.textContent.replace(/[:：]\s*$/, '').trim();
        var next = st.nextSibling;
        var val = '';
        while (next && next.nodeName !== 'BR' && next.nodeName !== 'STRONG') {
          val += next.textContent || '';
          next = next.nextSibling;
        }
        if (key && !map[key])
          map[key] = val.trim();
      });
    }

    function pick(regexes)
    {
      var keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) {
        for (var j = 0; j < regexes.length; j++) {
          if (regexes[j].test(keys[i]))
            return map[keys[i]];
        }
      }
      return '';
    }

    return {
      name: title,
      title: title,
      active: active,
      proto: pick([/协议|protocol/i]) || 'Static / DHCP',
      addr: pick([/地址|ipv4|address/i]) || '',
      gw: pick([/网关|gateway/i]) || '',
      dns: pick([/dns/i]) || '',
      uptime: pick([/连接|运行|connected|uptime/i]) || '',
      rxBytes: 0,
      txBytes: 0,
      rxSpeed: 0,
      txSpeed: 0
    };
  }

  function extractNetworkBoxes(networkSection)
  {
    var list = [];
    if (!networkSection)
      return list;

    var boxes = networkSection.querySelectorAll('.ifacebox');
    Array.prototype.forEach.call(boxes, function(box, idx) {
      list.push(parseIfaceBox(box, idx === 0 ? 'wan' : 'wan6'));
    });

    if (!list.length) {
      var rows = networkSection.querySelectorAll('.table .tr:not(.table-titles)');
      Array.prototype.forEach.call(rows, function(row) {
        var tds = row.querySelectorAll('.td');
        if (tds.length >= 4) {
          list.push({
            name: tds[0].textContent.trim() || 'lan',
            title: tds[0].textContent.trim() || 'lan',
            active: true,
            proto: 'Static',
            addr: tds[1].textContent.trim(),
            gw: '10.10.10.1',
            dns: '10.10.10.1',
            uptime: '',
            rxText: tds[3] ? tds[3].textContent.trim() : '',
            txText: tds[4] ? tds[4].textContent.trim() : '',
            rxBytes: 0,
            txBytes: 0,
            rxSpeed: 0,
            txSpeed: 0
          });
        }
      });
    }

    return list;
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

  function pushWanWaveSample(key, txBps, rxBps)
  {
    if (!key)
      return;
    var tx = Math.max(0, Number(txBps) || 0);
    var rx = Math.max(0, Number(rxBps) || 0);
    var entry = liveState.wanWaves[key];

    if (!entry) {
      var initTx = [];
      var initRx = [];
      for (var i = 0; i < 20; i++) {
        var factor = 0.55 + 0.32 * Math.sin(i * 0.65) + (i / 20) * 0.15;
        initTx.push(Math.max(0, tx * factor));
        initRx.push(
          Math.max(0, rx * (0.58 + 0.30 * Math.cos(i * 0.6) + (i / 20) * 0.14))
        );
      }
      initTx[19] = tx;
      initRx[19] = rx;
      liveState.wanWaves[key] = {
        tx: initTx,
        rx: initRx,
        seededWithTraffic: tx > 0 || rx > 0,
        tick: 1
      };
      return;
    }

    entry.tick = (entry.tick || 0) + 1;
    if (!entry.seededWithTraffic && (tx > 0 || rx > 0)) {
      for (var j = 0; j < 19; j++) {
        var f = 0.52 + 0.34 * Math.sin((j + entry.tick) * 0.7) + (j / 19) * 0.16;
        entry.tx[j] = Math.max(0, tx * f);
        entry.rx[j] = Math.max(
          0,
          rx * (0.56 + 0.32 * Math.cos((j + entry.tick) * 0.65) + (j / 19) * 0.15)
        );
      }
      entry.tx[19] = tx;
      entry.rx[19] = rx;
      entry.seededWithTraffic = true;
      return;
    }

    entry.tx.shift();
    entry.tx.push(tx);
    entry.rx.shift();
    entry.rx.push(rx);
  }

  function pollLiveRouterStats(callback)
  {
    if (!window.L || typeof window.L.require !== 'function')
      return;

    Promise.all([
      window.L.require('network').catch(function() { return null; }),
      window.L.require('rpc').catch(function() { return null; })
    ]).then(function(mods) {
      var network = mods[0];
      var rpc = mods[1];
      var tasks = [];

      if (network) {
        tasks.push(
          Promise.all([
            network.getNetworks ? network.getNetworks() : [],
            network.getDevices ? network.getDevices() : [],
            network.getWifiNetworks ? network.getWifiNetworks() : []
          ]).then(function(netRes) {
            var nets = netRes[0] || [];
            var devs = netRes[1] || [];
            var wifis = netRes[2] || [];
            var devMap = {};
            var now = Date.now();
            var dt = liveState.lastTick > 0 ?
              (now - liveState.lastTick) / 1000 : 0;

            var totalRx = 0;
            var totalTx = 0;
            var totalRxSpd = 0;
            var totalTxSpd = 0;

            devs.forEach(function(d) {
              var dname = (d.getName && d.getName()) || '';
              if (!dname || dname === 'lo')
                return;
              var rx = Number(d.getRXBytes && d.getRXBytes()) || 0;
              var tx = Number(d.getTXBytes && d.getTXBytes()) || 0;
              var prev = liveState.devCounters[dname];
              var rxSpd = prev ? (prev.rxSpeed || 0) : 0;
              var txSpd = prev ? (prev.txSpeed || 0) : 0;
              if (prev && dt >= 0.6 && rx >= prev.rx && tx >= prev.tx) {
                rxSpd = (rx - prev.rx) / dt;
                txSpd = (tx - prev.tx) / dt;
              }
              liveState.devCounters[dname] = {
                rx: rx,
                tx: tx,
                rxSpeed: rxSpd,
                txSpeed: txSpd
              };
              devMap[dname] = liveState.devCounters[dname];
              if (!/^veth|^docker|^br-/.test(dname)) {
                totalRx += rx;
                totalTx += tx;
                totalRxSpd += rxSpd;
                totalTxSpd += txSpd;
              }
            });

            if (totalRx === 0 && devMap['br-lan']) {
              totalRx = devMap['br-lan'].rx;
              totalTx = devMap['br-lan'].tx;
              totalRxSpd = devMap['br-lan'].rxSpeed;
              totalTxSpd = devMap['br-lan'].txSpeed;
            }

            if (liveState.lastTick > 0 && dt >= 0.6) {
              liveState.pollTicks = (liveState.pollTicks || 0) + 1;
              pushWanWaveSample('__total__', totalTxSpd, totalRxSpd);
            }
            liveState.lastTick = now;
            liveState.totalBytes = totalRx + totalTx;
            liveState.totalRxSpeed = totalRxSpd;
            liveState.totalTxSpeed = totalTxSpd;

            var parsedIfaces = [];
            nets.forEach(function(n) {
              var name = (n.getName && n.getName()) || '';
              if (!name || name === 'loopback')
                return;
              var l3 = (n.getL3Device && n.getL3Device()) ||
                (n.getDevice && n.getDevice());
              var dname = (l3 && l3.getName && l3.getName()) || name;
              var cnt = devMap[dname] || { rx: 0, tx: 0, rxSpeed: 0, txSpeed: 0 };
              var ip = (n.getIPAddr && n.getIPAddr()) ||
                (n.getIP6Addr && n.getIP6Addr()) || '';
              var gw = (n.getGatewayAddr && n.getGatewayAddr()) ||
                (n.getGateway6Addr && n.getGateway6Addr()) || '';
              var dnsArr = (n.getDNSAddrs && n.getDNSAddrs()) || [];
              var proto = (n.getProtocol && n.getProtocol()) || 'static';
              var up = (n.isUp && n.isUp()) !== false;
              var uptime = (n.getUptime && n.getUptime()) || 0;

              var ifRxSpd = cnt.rxSpeed || totalRxSpd || 0;
              var ifTxSpd = cnt.txSpeed || totalTxSpd || 0;
              if (dt >= 0.6) {
                pushWanWaveSample(name, ifTxSpd, ifRxSpd);
              }

              if (ip || up) {
                parsedIfaces.push({
                  name: name,
                  devName: dname,
                  title: name + (dname && dname !== name ? ' (' + dname + ')' : ''),
                  active: up,
                  proto: String(proto).toUpperCase(),
                  addr: ip,
                  gw: gw || '--',
                  dns: dnsArr.slice(0, 2).join(', ') || '--',
                  uptime: uptime,
                  rxBytes: cnt.rx || totalRx,
                  txBytes: cnt.tx || totalTx,
                  rxSpeed: ifRxSpd,
                  txSpeed: ifTxSpd
                });
              }
            });

            if (parsedIfaces.length) {
              parsedIfaces.sort(function(a, b) {
                var aWan = /^wan/i.test(a.name) ? 0 : 1;
                var bWan = /^wan/i.test(b.name) ? 0 : 1;
                return aWan - bWan;
              });
              liveState.ifaces = parsedIfaces;
            }

            var wifiClients = 0;
            wifis.forEach(function(w) {
              if (w && Array.isArray(w.assoclist))
                wifiClients += w.assoclist.length;
              else if (w && w.getAssocList) {
                var al = w.getAssocList();
                if (Array.isArray(al))
                  wifiClients += al.length;
              }
            });
            liveState.wirelessClients = wifiClients;
          }).catch(function() {})
        );
      }

      if (rpc && typeof rpc.declare === 'function') {
        var callConns = rpc.declare({
          object: 'luci',
          method: 'getRealtimeStats',
          params: ['mode', 'device'],
          expect: { result: [] }
        });
        var callBoard = rpc.declare({
          object: 'system',
          method: 'board'
        });
        var callSysInfo = rpc.declare({
          object: 'system',
          method: 'info'
        });
        var callDhcpLeases = rpc.declare({
          object: 'luci-rpc',
          method: 'getDHCPLeases'
        });
        var callHostHints = rpc.declare({
          object: 'luci-rpc',
          method: 'getHostHints'
        });

        tasks.push(
          callConns('connections', '').then(function(rows) {
            if (Array.isArray(rows) && rows.length) {
              var last = rows[rows.length - 1];
              if (Array.isArray(last) && last.length >= 4) {
                var udp = Number(last[1]) || 0;
                var tcp = Number(last[2]) || 0;
                var other = Number(last[3]) || 0;
                liveState.udpCount = udp;
                liveState.tcpCount = tcp;
                liveState.icmpCount = other;
                liveState.connTotal = udp + tcp + other;
              }
            }
          }).catch(function() {})
        );

        tasks.push(
          callBoard().then(function(board) {
            if (board && typeof board === 'object')
              liveState.boardInfo = board;
          }).catch(function() {})
        );

        tasks.push(
          callSysInfo().then(function(info) {
            if (!info || typeof info !== 'object')
              return;
            liveState.sysInfo = info;

            var stRows = [];
            if (info.memory && info.memory.total > 0) {
              var mTotal = Number(info.memory.total) || 0;
              var mAvail = Number(info.memory.available || info.memory.free) || 0;
              var mUsed = Math.max(0, mTotal - mAvail);
              var mCached = Number(info.memory.cached) || 0;
              var mBuffered = Number(info.memory.buffered) || 0;
              var mPct = Math.round((mUsed / mTotal) * 100);
              liveState.memPct = mPct;
              liveState.memDetail = formatBytes(mUsed) + ' / ' +
                formatBytes(mTotal) + ' (' + mPct + '%)';
              stRows.push({
                key: isChinese ? '已使用内存' : 'Memory Used',
                value: liveState.memDetail,
                percent: mPct
              });
              if (mCached > 0) {
                var cPct = Math.round((mCached / mTotal) * 100);
                stRows.push({
                  key: isChinese ? '已缓存内存' : 'Memory Cached',
                  value: formatBytes(mCached) + ' / ' + formatBytes(mTotal) +
                    ' (' + cPct + '%)',
                  percent: cPct
                });
              }
              if (mBuffered > 0) {
                var bPct = Math.round((mBuffered / mTotal) * 100);
                stRows.push({
                  key: isChinese ? '已缓冲内存' : 'Memory Buffered',
                  value: formatBytes(mBuffered) + ' / ' + formatBytes(mTotal) +
                    ' (' + bPct + '%)',
                  percent: bPct
                });
              }
            }

            if (info.root && info.root.total > 0) {
              var rMult = info.root.total < 100 * 1024 * 1024 ? 1024 : 1;
              var rTotal = Number(info.root.total) * rMult;
              var rUsed = Number(info.root.used) * rMult;
              var rPct = Math.round((rUsed / rTotal) * 100);
              liveState.diskPct = rPct;
              liveState.diskDetail = formatBytes(rUsed) + ' / ' +
                formatBytes(rTotal) + ' (' + rPct + '%)';
              stRows.push({
                key: isChinese ? '根目录磁盘空间 (/)' : 'Root Disk Space (/)',
                value: liveState.diskDetail,
                percent: rPct
              });
            }

            if (info.tmp && info.tmp.total > 0) {
              var tMult = info.tmp.total < 100 * 1024 * 1024 ? 1024 : 1;
              var tTotal = Number(info.tmp.total) * tMult;
              var tUsed = Number(info.tmp.used) * tMult;
              var tPct = Math.round((tUsed / tTotal) * 100);
              stRows.push({
                key: isChinese ? '临时空间 (/tmp)' : 'Temp Space (/tmp)',
                value: formatBytes(tUsed) + ' / ' + formatBytes(tTotal) +
                  ' (' + tPct + '%)',
                percent: tPct
              });
            }

            if (stRows.length)
              liveState.rpcStorageRows = stRows;
          }).catch(function() {})
        );

        tasks.push(
          Promise.all([
            callDhcpLeases().catch(function() { return null; }),
            callHostHints().catch(function() { return null; })
          ]).then(function(res) {
            var dhcpData = res[0] || {};
            var hints = res[1] || {};
            var list = [];
            var seenMac = {};

            var v4 = Array.isArray(dhcpData.dhcp_leases) ?
              dhcpData.dhcp_leases : [];
            v4.forEach(function(l) {
              var mac = String(l.macaddr || '').toUpperCase();
              if (mac)
                seenMac[mac] = true;
              list.push({
                hostname: l.hostname || (mac && hints[mac] && hints[mac].name) || '*',
                ip: l.ipaddr || '--',
                mac: mac || '--',
                expires: typeof l.expires === 'number' && l.expires > 0 ?
                  formatUptimeChinese(l.expires) :
                  (isChinese ? '永久 / 在线' : 'Static / Active'),
                type: isChinese ? '有线 (DHCPv4)' : 'Wired (DHCPv4)'
              });
            });

            var v6 = Array.isArray(dhcpData.dhcp6_leases) ?
              dhcpData.dhcp6_leases : [];
            v6.forEach(function(l) {
              var mac = String(l.macaddr || l.duid || '').toUpperCase();
              if (mac && seenMac[mac])
                return;
              if (mac)
                seenMac[mac] = true;
              list.push({
                hostname: l.hostname || '*',
                ip: l.ip6addr || (Array.isArray(l.ip6addrs) ? l.ip6addrs[0] : '--'),
                mac: mac || '--',
                expires: typeof l.expires === 'number' && l.expires > 0 ?
                  formatUptimeChinese(l.expires) :
                  (isChinese ? '在线' : 'Active'),
                type: isChinese ? '有线 (DHCPv6)' : 'Wired (DHCPv6)'
              });
            });

            if (hints && typeof hints === 'object') {
              Object.keys(hints).forEach(function(macKey) {
                var mac = String(macKey).toUpperCase();
                if (seenMac[mac])
                  return;
                var h = hints[macKey] || {};
                var ips = Array.isArray(h.ipaddrs) ? h.ipaddrs : [];
                var ip6s = Array.isArray(h.ip6addrs) ? h.ip6addrs : [];
                var ip = ips[0] || ip6s[0] || '';
                if (!ip)
                  return;
                seenMac[mac] = true;
                list.push({
                  hostname: h.name || '*',
                  ip: ip,
                  mac: mac,
                  expires: isChinese ? 'ARP 邻居在线' : 'Active Neighbor',
                  type: isChinese ? '局域网终端' : 'LAN Host'
                });
              });
            }

            if (list.length)
              liveState.rpcLeases = list;
          }).catch(function() {})
        );
      }

      return Promise.all(tasks);
    }).then(function() {
      if (typeof callback === 'function')
        callback();
    }).catch(function() {});
  }

  function createDonutSvg(colorClass)
  {
    return '<svg class="homeui-donut-svg ' + colorClass +
      '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle class="donut-track" cx="24" cy="24" r="18"></circle>' +
      '<circle class="donut-arc" cx="24" cy="24" r="18" ' +
        'stroke-dasharray="113.1" stroke-dashoffset="85"></circle>' +
    '</svg>';
  }

  function setDonutProgress(cardEl, percent, centerText)
  {
    if (!cardEl)
      return;

    var pct = Math.max(4, Math.min(100, Number(percent) || 0));
    var circumference = 113.1;
    var offset = circumference - (circumference * pct) / 100;
    var arc = cardEl.querySelector('.donut-arc');
    var label = cardEl.querySelector('.homeui-donut-val');

    if (arc)
      arc.setAttribute('stroke-dashoffset', offset.toFixed(1));
    if (label && label.textContent !== String(centerText))
      label.textContent = String(centerText);
  }

  function buildSmoothPath(points, width, height, padTop, padBottom, maxVal, rightPad)
  {
    var count = points.length;
    if (!count)
      return { line: '', area: '', coords: [] };

    var plotLeft = 40;
    var plotRight = width - (rightPad || 48);
    var plotW = plotRight - plotLeft;
    var plotH = height - padTop - padBottom;
    var safeMax = Math.max(1, maxVal);

    var coords = points.map(function(val, idx) {
      var x = plotLeft + (plotW * idx) / Math.max(1, count - 1);
      var ratio = Math.max(0, Math.min(1, (Number(val) || 0) / safeMax));
      var y = padTop + plotH * (1 - ratio);
      return [x, y];
    });

    var d = 'M ' + coords[0][0].toFixed(1) + ' ' + coords[0][1].toFixed(1);
    for (var i = 0; i < coords.length - 1; i++) {
      var p0 = coords[i];
      var p1 = coords[i + 1];
      var cx = ((p0[0] + p1[0]) / 2).toFixed(1);
      d += ' C ' + cx + ' ' + p0[1].toFixed(1) + ', ' +
        cx + ' ' + p1[1].toFixed(1) + ', ' +
        p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
    }

    var baseLineY = (padTop + plotH).toFixed(1);
    var area = d +
      ' L ' + coords[coords.length - 1][0].toFixed(1) + ' ' + baseLineY +
      ' L ' + coords[0][0].toFixed(1) + ' ' + baseLineY + ' Z';

    return { line: d, area: area, coords: coords };
  }

  function getRateSeriesForSelection()
  {
    var store = chartState.rateRange === '24h' ?
      historyState.h24 : historyState.h1;
    var isPeak = chartState.rateStat === 'peak';
    var iface = chartState.rateIface || 'all';
    var txArr = isPeak ? store.txPeak : store.txAvg;
    var rxArr = isPeak ? store.rxPeak : store.rxAvg;

    if (iface !== 'all' && store.ifaceSeries && store.ifaceSeries[iface]) {
      var sub = store.ifaceSeries[iface];
      txArr = isPeak ? sub.txPeak : sub.txAvg;
      rxArr = isPeak ? sub.rxPeak : sub.rxAvg;
    }

    return {
      times: getAxisLabels(chartState.rateRange),
      tx: txArr,
      rx: rxArr,
      latency: store.latency
    };
  }

  function renderRateChartSvg(dash)
  {
    if (!dash)
      return;
    var container = dash.querySelector('[data-chart-rate]');
    if (!container)
      return;

    var data = getRateSeriesForSelection();
    var w = 1120;
    var h = 152;
    var padTop = 14;
    var padBottom = 24;
    var plotLeft = 40;
    var plotRight = w - 58;
    var plotH = h - padTop - padBottom;
    var maxRate = Math.max.apply(
      null,
      data.tx.concat(data.rx, [100])
    );
    var stepUnit = maxRate > 2000 ? 500 : (maxRate > 500 ? 200 : 50);
    var niceMax = Math.max(100, Math.ceil(maxRate / stepUnit) * stepUnit);

    var txPath = buildSmoothPath(
      data.tx, w, h, padTop, padBottom, niceMax, 58
    );
    var rxPath = buildSmoothPath(
      data.rx, w, h, padTop, padBottom, niceMax, 58
    );
    var latPath = buildSmoothPath(
      data.latency, w, h, padTop, padBottom, 30, 58
    );

    var gridHtml = '';
    for (var g = 0; g <= 5; g++) {
      var gy = (padTop + (plotH * g) / 5).toFixed(1);
      var leftVal = 30 - g * 6;
      var rightVal = Math.round(((5 - g) * niceMax) / 5);
      var rightLabel = rightVal === 0 ? '0 B' :
        (rightVal >= 1024 ? (rightVal / 1024).toFixed(1) + ' MB' :
          rightVal + ' KB');

      gridHtml +=
        '<line class="chart-grid-line" x1="' + plotLeft + '" y1="' + gy +
          '" x2="' + plotRight + '" y2="' + gy + '"></line>' +
        '<text class="chart-axis-text" x="30" y="' + (Number(gy) + 3.5) +
          '" text-anchor="end">' + leftVal + '</text>' +
        '<text class="chart-axis-text" x="' + (plotRight + 8) + '" y="' +
          (Number(gy) + 3.5) + '" text-anchor="start">' + rightLabel + '</text>';
    }

    var xLabels = '';
    var pointsHtml = '';
    data.times.forEach(function(t, idx) {
      var x = (plotLeft + ((plotRight - plotLeft) * idx) / 11).toFixed(1);
      xLabels += '<text class="chart-axis-text" x="' + x +
        '" y="146" text-anchor="middle">' + t + '</text>';

      if (txPath.coords[idx] && rxPath.coords[idx]) {
        var txY = txPath.coords[idx][1].toFixed(1);
        var rxY = rxPath.coords[idx][1].toFixed(1);
        var tip = t + ' | ↑ ' + formatRateKB(data.tx[idx]) +
          ' / ↓ ' + formatRateKB(data.rx[idx]);
        pointsHtml +=
          '<circle cx="' + x + '" cy="' + txY +
            '" r="2.6" fill="#ffffff" stroke="#7c89f8" stroke-width="1.3">' +
            '<title>' + tip + '</title></circle>' +
          '<circle cx="' + x + '" cy="' + rxY +
            '" r="2.6" fill="#ffffff" stroke="#5ad8a6" stroke-width="1.3">' +
            '<title>' + tip + '</title></circle>';
      }
    });

    container.innerHTML =
      '<svg class="homeui-ikuai-svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs>' +
          '<linearGradient id="homeuiTxGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#6979f8" stop-opacity="0.22"/>' +
            '<stop offset="100%" stop-color="#6979f8" stop-opacity="0.01"/>' +
          '</linearGradient>' +
          '<linearGradient id="homeuiRxGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#5ad8a6" stop-opacity="0.20"/>' +
            '<stop offset="100%" stop-color="#5ad8a6" stop-opacity="0.01"/>' +
          '</linearGradient>' +
        '</defs>' +
        gridHtml +
        '<path d="' + txPath.area + '" fill="url(#homeuiTxGrad)"></path>' +
        '<path d="' + rxPath.area + '" fill="url(#homeuiRxGrad)"></path>' +
        '<path d="' + latPath.line + '" fill="none" stroke="#69b1ff" ' +
          'stroke-width="1.2" stroke-dasharray="3 3"></path>' +
        '<path d="' + txPath.line + '" fill="none" stroke="#7c89f8" ' +
          'stroke-width="1.5"></path>' +
        '<path d="' + rxPath.line + '" fill="none" stroke="#5ad8a6" ' +
          'stroke-width="1.5"></path>' +
        pointsHtml +
        xLabels +
      '</svg>';

    var lastTx = data.tx[data.tx.length - 1] || 0;
    var lastRx = data.rx[data.rx.length - 1] || 0;
    setText(dash, '[data-leg-tx]', formatRateKB(lastTx));
    setText(dash, '[data-leg-rx]', formatRateKB(lastRx));
  }

  function renderClientBarSvg(dash)
  {
    if (!dash)
      return;
    var container = dash.querySelector('[data-chart-clients]');
    if (!container)
      return;

    var store = chartState.clientRange === '24h' ?
      historyState.h24 : historyState.h1;
    var isPeak = chartState.clientStat === 'peak';
    var cType = chartState.clientType || 'wired';
    var series;

    if (cType === 'wireless') {
      series = isPeak ? store.wirelessPeak : store.wirelessAvg;
    } else if (cType === 'all') {
      series = store.wiredAvg.map(function(w, idx) {
        var wl = isPeak ? store.wirelessPeak[idx] : store.wirelessAvg[idx];
        var wd = isPeak ? store.wiredPeak[idx] : w;
        return (Number(wd) || 0) + (Number(wl) || 0);
      });
    } else {
      series = isPeak ? store.wiredPeak : store.wiredAvg;
    }

    var times = getAxisLabels(chartState.clientRange);
    var w = 1120;
    var h = 146;
    var padTop = 16;
    var padBottom = 24;
    var plotLeft = 40;
    var plotRight = w - 24;
    var plotH = h - padTop - padBottom;
    var maxVal = Math.max.apply(null, series.concat([10]));
    var niceMax = Math.max(10, Math.ceil(maxVal / 5) * 5);

    var gridHtml = '';
    for (var g = 0; g <= 5; g++) {
      var gy = (padTop + (plotH * g) / 5).toFixed(1);
      var leftVal = Math.round(((5 - g) * niceMax) / 5);
      gridHtml +=
        '<line class="chart-grid-line" x1="' + plotLeft + '" y1="' + gy +
          '" x2="' + plotRight + '" y2="' + gy + '"></line>' +
        '<text class="chart-axis-text" x="30" y="' + (Number(gy) + 3.5) +
          '" text-anchor="end">' + leftVal + '</text>';
    }

    var barsHtml = '';
    var step = (plotRight - 28 - (plotLeft + 24)) / 11;
    var barColor = cType === 'wireless' ? '#95de64' :
      (cType === 'all' ? '#85a5ff' : '#cbc6f9');

    series.forEach(function(val, idx) {
      var numVal = Math.max(0, Math.round(Number(val) || 0));
      var cx = plotLeft + 24 + step * idx;
      var ratio = numVal === 0 ? 0.02 :
        Math.max(0.05, Math.min(1, numVal / niceMax));
      var bh = plotH * ratio;
      var by = padTop + plotH - bh;
      var t = times[idx] || '';

      barsHtml +=
        '<rect x="' + (cx - 10).toFixed(1) + '" y="' + by.toFixed(1) +
          '" width="20" height="' + bh.toFixed(1) +
          '" rx="3" fill="' + barColor + '">' +
          '<title>' + t + ': ' + numVal + '</title></rect>' +
        '<text class="chart-val-text" x="' + cx.toFixed(1) + '" y="' +
          Math.max(11, by - 4).toFixed(1) + '" text-anchor="middle">' +
          numVal + '</text>' +
        '<text class="chart-axis-text" x="' + cx.toFixed(1) +
          '" y="140" text-anchor="middle">' + t + '</text>';
    });

    container.innerHTML =
      '<svg class="homeui-ikuai-svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        gridHtml +
        barsHtml +
      '</svg>';
  }

  function renderMemoryLineSvg(dash)
  {
    if (!dash)
      return;
    var container = dash.querySelector('[data-chart-memory]');
    if (!container)
      return;

    var store = chartState.memRange === '24h' ?
      historyState.h24 : historyState.h1;
    var series = chartState.memStat === 'peak' ?
      store.memPeak : store.memAvg;
    var times = getAxisLabels(chartState.memRange);

    var w = 1120;
    var h = 138;
    var padTop = 14;
    var padBottom = 22;
    var plotLeft = 40;
    var plotRight = w - 24;
    var plotH = h - padTop - padBottom;
    var pathObj = buildSmoothPath(series, w, h, padTop, padBottom, 100, 24);

    var gridHtml = '';
    for (var g = 0; g <= 5; g++) {
      var gy = (padTop + (plotH * g) / 5).toFixed(1);
      var pctVal = 100 - g * 20;
      gridHtml +=
        '<line class="chart-grid-line" x1="' + plotLeft + '" y1="' + gy +
          '" x2="' + plotRight + '" y2="' + gy + '"></line>' +
        '<text class="chart-axis-text" x="32" y="' + (Number(gy) + 3.5) +
          '" text-anchor="end">' + pctVal + '%</text>';
    }

    var dotsHtml = '';
    times.forEach(function(t, idx) {
      var coord = pathObj.coords[idx] || [
        plotLeft + ((plotRight - plotLeft) * idx) / 11,
        padTop + plotH
      ];
      var x = coord[0].toFixed(1);
      var y = coord[1].toFixed(1);
      var val = Math.round(Number(series[idx]) || 0);

      dotsHtml +=
        '<circle cx="' + x + '" cy="' + y +
          '" r="3" fill="#ffffff" stroke="#3b82f6" stroke-width="1.5">' +
          '<title>' + t + ': ' + val + '%</title></circle>' +
        (idx === 11 || idx % 3 === 0 ?
          '<text class="chart-val-text" x="' + x + '" y="' +
            Math.max(11, coord[1] - 6).toFixed(1) +
            '" text-anchor="middle">' + val + '%</text>' : '') +
        '<text class="chart-axis-text" x="' + x +
          '" y="132" text-anchor="middle">' + t + '</text>';
    });

    container.innerHTML =
      '<svg class="homeui-ikuai-svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs>' +
          '<linearGradient id="homeuiMemGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#3b82f6" stop-opacity="0.16"/>' +
            '<stop offset="100%" stop-color="#3b82f6" stop-opacity="0.01"/>' +
          '</linearGradient>' +
        '</defs>' +
        gridHtml +
        '<path d="' + pathObj.area + '" fill="url(#homeuiMemGrad)"></path>' +
        '<path d="' + pathObj.line + '" fill="none" stroke="#3b82f6" ' +
          'stroke-width="1.6"></path>' +
        dotsHtml +
      '</svg>';
  }

  function createDropdownHtml(id, currentLabel, options)
  {
    var itemsHtml = options.map(function(opt) {
      return '<li class="homeui-dropdown-item' +
        (opt.active ? ' is-active' : '') +
        '" data-opt-val="' + opt.value + '">' +
        '<span>' + opt.label + '</span>' +
      '</li>';
    }).join('');

    return '<div class="homeui-dropdown" data-dropdown="' + id + '">' +
      '<button type="button" class="homeui-select-pill" data-dropdown-btn>' +
        '<span data-dropdown-label>' + currentLabel + '</span> <i>▾</i>' +
      '</button>' +
      '<ul class="homeui-dropdown-menu" data-dropdown-menu>' +
        itemsHtml +
      '</ul>' +
    '</div>';
  }

  function updateIfaceDropdownMenu(dash, ifaces)
  {
    var dd = dash.querySelector('[data-dropdown="rate-iface"]');
    if (!dd)
      return;

    var menu = dd.querySelector('[data-dropdown-menu]');
    var labelEl = dd.querySelector('[data-dropdown-label]');
    if (!menu || !labelEl)
      return;

    var opts = [
      { value: 'all', label: isChinese ? '全部' : 'All' }
    ];
    var seen = { all: true };

    ifaces.forEach(function(iface) {
      var key = iface.name || iface.title;
      if (key && !seen[key]) {
        seen[key] = true;
        opts.push({
          value: key,
          label: key
        });
      }
    });

    if (!seen[chartState.rateIface])
      chartState.rateIface = 'all';

    var activeOpt = opts.find(function(o) {
      return o.value === chartState.rateIface;
    }) || opts[0];

    labelEl.textContent = activeOpt.label;
    menu.innerHTML = opts.map(function(opt) {
      return '<li class="homeui-dropdown-item' +
        (opt.value === chartState.rateIface ? ' is-active' : '') +
        '" data-opt-val="' + opt.value + '">' +
        '<span>' + opt.label + '</span>' +
      '</li>';
    }).join('');
  }

  function renderBottomRightPanel(dash, netBoxes)
  {
    if (!dash)
      return;
    var body = dash.querySelector('[data-bottom-tab-body]');
    var badge = dash.querySelector('[data-lease-count]');
    if (badge)
      badge.textContent = String(liveState.leases.length);
    if (!body)
      return;

    var tab = chartState.bottomTab || 'leases';

    if (tab === 'leases') {
      if (!liveState.leases.length) {
        body.innerHTML = '<div class="homeui-empty-hint">' +
          (isChinese ? '当前暂无已分配的 DHCP 终端租约记录' : 'No active DHCP leases') +
        '</div>';
        return;
      }

      var rowsHtml = liveState.leases.slice(0, 12).map(function(item) {
        var isWifi = /无线|wireless|wifi/i.test(item.type);
        return '<tr>' +
          '<td><strong>' + item.hostname + '</strong></td>' +
          '<td>' + item.ip + '</td>' +
          '<td><code>' + item.mac + '</code></td>' +
          '<td><span class="homeui-tag ' + (isWifi ? 'is-green' : 'is-blue') + '">' +
            item.type + '</span></td>' +
          '<td>' + item.expires + '</td>' +
        '</tr>';
      }).join('');

      body.innerHTML =
        '<div class="homeui-ikuai-table-wrap">' +
          '<table class="homeui-ikuai-table">' +
            '<thead><tr>' +
              '<th>' + (isChinese ? '终端名称' : 'Hostname') + '</th>' +
              '<th>' + (isChinese ? 'IP 地址' : 'IP Address') + '</th>' +
              '<th>' + (isChinese ? 'MAC 地址' : 'MAC Address') + '</th>' +
              '<th>' + (isChinese ? '连接类型' : 'Type') + '</th>' +
              '<th>' + (isChinese ? '剩余租期 / 状态' : 'Lease / Status') + '</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>';
    } else if (tab === 'interfaces') {
      var list = liveState.ifaces.length ? liveState.ifaces : netBoxes;
      if (!list || !list.length) {
        body.innerHTML = '<div class="homeui-empty-hint">' +
          (isChinese ? '暂无网络接口明细' : 'No interface details') +
        '</div>';
        return;
      }

      var ifRows = list.map(function(it) {
        var traffic = (it.rxBytes || it.txBytes) ?
          ('↓ ' + formatBytes(it.rxBytes) + ' / ↑ ' + formatBytes(it.txBytes)) :
          ((it.rxText || '--') + ' / ' + (it.txText || '--'));
        return '<tr>' +
          '<td><strong>' + (it.title || it.name) + '</strong></td>' +
          '<td><span class="homeui-tag is-blue">' + (it.proto || 'STATIC') + '</span></td>' +
          '<td>' + (it.addr || '--') + '</td>' +
          '<td>' + (it.gw || '--') + '</td>' +
          '<td>' + traffic + '</td>' +
        '</tr>';
      }).join('');

      body.innerHTML =
        '<div class="homeui-ikuai-table-wrap">' +
          '<table class="homeui-ikuai-table">' +
            '<thead><tr>' +
              '<th>' + (isChinese ? '接口名称' : 'Interface') + '</th>' +
              '<th>' + (isChinese ? '协议' : 'Protocol') + '</th>' +
              '<th>' + (isChinese ? 'IPv4/IPv6 地址' : 'Address') + '</th>' +
              '<th>' + (isChinese ? '网关' : 'Gateway') + '</th>' +
              '<th>' + (isChinese ? '累计上下行流量' : 'Total Traffic') + '</th>' +
            '</tr></thead>' +
            '<tbody>' + ifRows + '</tbody>' +
          '</table>' +
        '</div>';
    } else {
      var stRows = liveState.storageRows || [];
      if (!stRows.length) {
        body.innerHTML = '<div class="homeui-empty-hint">' +
          (isChinese ? '暂无更多存储与内存分项数据' : 'No extra storage entries') +
        '</div>';
        return;
      }

      body.innerHTML = '<div class="homeui-res-bars">' +
        stRows.map(function(r) {
          var pct = Math.max(3, Math.min(100, Number(r.percent) || 12));
          return '<div class="homeui-res-item">' +
            '<div class="homeui-res-row">' +
              '<span>' + r.key + '</span>' +
              '<strong>' + r.value + '</strong>' +
            '</div>' +
            '<div class="homeui-res-track">' +
              '<div class="homeui-res-fill" style="width:' + pct + '%"></div>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    }
  }

  function createIkuaiDashboard(view)
  {
    var dash = document.createElement('div');
    dash.className = 'homeui-ikuai-dashboard';

    var avgLabel = isChinese ? '平均值' : 'Average';
    var peakLabel = isChinese ? '峰值' : 'Peak';
    var statOpts = [
      { value: 'avg', label: avgLabel, active: true },
      { value: 'peak', label: peakLabel, active: false }
    ];
    var ifaceOpts = [
      { value: 'all', label: isChinese ? '全部' : 'All', active: true }
    ];
    var clientTypeOpts = [
      { value: 'wired', label: isChinese ? '有线' : 'Wired', active: true },
      { value: 'wireless', label: isChinese ? '无线' : 'Wireless', active: false },
      { value: 'all', label: isChinese ? '全部' : 'All', active: false }
    ];

    dash.innerHTML =
      '<section class="homeui-ikuai-topcard">' +
        '<div class="homeui-device-block">' +
          '<div class="homeui-uptime-badge" data-ov-uptime>' +
            (isChinese ? '系统运行时间: --' : 'Uptime: --') +
          '</div>' +
          '<div class="homeui-device-main">' +
            '<div class="homeui-chassis-box" aria-hidden="true">' +
              '<svg viewBox="0 0 88 42" class="homeui-chassis-svg">' +
                '<rect x="4" y="10" width="80" height="24" rx="3" fill="#cfd6e0" stroke="#9aa5b4" stroke-width="1"/>' +
                '<path d="M4 13 L12 6 H76 L84 13 Z" fill="#e2e7ef" stroke="#b0bac8" stroke-width="0.8"/>' +
                '<rect x="9" y="15" width="70" height="14" rx="1.5" fill="#707985"/>' +
                '<circle cx="15" cy="22" r="2" fill="#28c76f"/>' +
                '<circle cx="21" cy="22" r="1.6" fill="#4096ff"/>' +
                '<rect x="29" y="19" width="22" height="5" rx="1" fill="#3a414a"/>' +
                '<rect x="56" y="19" width="6" height="5" rx="0.8" fill="#2c323a"/>' +
                '<rect x="64" y="19" width="6" height="5" rx="0.8" fill="#2c323a"/>' +
                '<rect x="12" y="34" width="10" height="3" rx="1" fill="#59626e"/>' +
                '<rect x="66" y="34" width="10" height="3" rx="1" fill="#59626e"/>' +
              '</svg>' +
            '</div>' +
            '<div class="homeui-device-meta">' +
              '<div class="homeui-device-line1">' +
                '<strong class="homeui-device-title" data-ov-hostname>HomeWrt</strong>' +
                '<span class="homeui-device-gwid" data-ov-gwid>x86_64</span>' +
                '<span class="homeui-device-tip" data-ov-tip title="HomeWrt Gateway">?</span>' +
              '</div>' +
              '<div class="homeui-device-line2">' +
                '<span class="homeui-device-ver" data-ov-ver>25.12</span>' +
                '<em class="homeui-device-edition">' +
                  (isChinese ? '免费版' : 'Custom') +
                '</em>' +
                '<span class="homeui-device-ip">IP:<b data-ov-ip>10.10.10.2</b></span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="homeui-ring-card is-blue" data-ring-card="cpu">' +
          '<div class="homeui-ring-title">' +
            (isChinese ? '系统负载' : 'System Load') +
          '</div>' +
          '<div class="homeui-ring-body">' +
            '<div class="homeui-donut-wrap">' +
              createDonutSvg('donut-blue') +
              '<span class="homeui-donut-val">0%</span>' +
            '</div>' +
            '<div class="homeui-ring-stats">' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-cpu-stat>0%</strong>' +
                '<small>' + (isChinese ? 'CPU占用' : 'CPU') + '</small>' +
              '</div>' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-disk-stat>0%</strong>' +
                '<small>' + (isChinese ? '存储占用' : 'Storage') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="homeui-ring-card is-purple" data-ring-card="clients">' +
          '<div class="homeui-ring-title">' +
            (isChinese ? '下联终端' : 'Active Clients') +
          '</div>' +
          '<div class="homeui-ring-body">' +
            '<div class="homeui-donut-wrap">' +
              createDonutSvg('donut-purple') +
              '<span class="homeui-donut-val">0</span>' +
            '</div>' +
            '<div class="homeui-ring-stats">' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-wifi-stat>0</strong>' +
                '<small>' + (isChinese ? '无线' : 'Wireless') + '</small>' +
              '</div>' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-wired-stat>0</strong>' +
                '<small>' + (isChinese ? '有线' : 'Wired') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="homeui-ring-card is-orange" data-ring-card="conns">' +
          '<div class="homeui-ring-title">' +
            (isChinese ? '连接数' : 'Connections') +
          '</div>' +
          '<div class="homeui-ring-body">' +
            '<div class="homeui-donut-wrap">' +
              createDonutSvg('donut-orange') +
              '<span class="homeui-donut-val">0</span>' +
            '</div>' +
            '<div class="homeui-ring-stats three-cols">' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-tcp-stat>0</strong>' +
                '<small>TCP</small>' +
              '</div>' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-udp-stat>0</strong>' +
                '<small>UDP</small>' +
              '</div>' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-icmp-stat>0</strong>' +
                '<small>ICMP</small>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="homeui-ikuai-body">' +
        '<aside class="homeui-ikuai-left">' +
          '<section class="homeui-wan-card">' +
            '<div class="homeui-card-head">' +
              '<h3>' + (isChinese ? 'WAN信息' : 'Gateway Info') + '</h3>' +
            '</div>' +
            '<button type="button" class="homeui-wan-pill" data-wan-switch ' +
              'title="' + (isChinese ? '点击切换网络接口' : 'Click to switch interface') + '">' +
              'wan / br-lan' +
            '</button>' +
            '<ul class="homeui-wan-list">' +
              '<li>' +
                '<span>' + (isChinese ? '网络角色' : 'Role') + '</span>' +
                '<strong class="homeui-isp-val">' +
                  '<i class="isp-knot"></i>' +
                  '<em data-wan-isp>' +
                    (isChinese ? '路由网关' : 'Gateway') +
                  '</em>' +
                '</strong>' +
              '</li>' +
              '<li>' +
                '<span>WAN IP</span>' +
                '<strong data-wan-ip>10.10.10.2</strong>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '接入方式' : 'Protocol') + '</span>' +
                '<strong data-wan-proto>STATIC</strong>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '上级网关' : 'Gateway') + '</span>' +
                '<strong data-wan-gw>10.10.10.1</strong>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '运行时间' : 'Uptime') + '</span>' +
                '<strong data-wan-uptime>--</strong>' +
              '</li>' +
              '<li>' +
                '<span>' +
                  (isChinese ? '累计使用流量' : 'Traffic Used') +
                '</span>' +
                '<strong data-wan-total>0 B</strong>' +
              '</li>' +
              '<li class="wan-rate-row">' +
                '<span>' + (isChinese ? '上下行速率' : 'Throughput') + '</span>' +
                '<strong class="homeui-wan-rates">' +
                  '<em class="rate-up">↑ <b data-wan-tx>0 B/s</b></em>' +
                  '<em class="rate-down">↓ <b data-wan-rx>0 B/s</b></em>' +
                '</strong>' +
              '</li>' +
              '<li class="wan-wave-row" aria-hidden="true">' +
                '<div class="homeui-mini-waves">' +
                  '<div class="homeui-wave-item is-up">' +
                    '<span class="wave-tag">↑</span>' +
                    '<svg viewBox="0 0 210 20" preserveAspectRatio="none" class="wave-up" data-wan-wave-tx></svg>' +
                  '</div>' +
                  '<div class="homeui-wave-item is-down">' +
                    '<span class="wave-tag">↓</span>' +
                    '<svg viewBox="0 0 210 20" preserveAspectRatio="none" class="wave-down" data-wan-wave-rx></svg>' +
                  '</div>' +
                '</div>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '系统负载' : 'Load Avg') + '</span>' +
                '<strong data-wan-load>0.00</strong>' +
              '</li>' +
            '</ul>' +
          '</section>' +

          '<section class="homeui-quick-card">' +
            '<div class="homeui-card-head">' +
              '<h3>' + (isChinese ? '快捷入口' : 'Quick Access') + '</h3>' +
              '<button type="button" class="homeui-head-link" data-customize-shortcuts>' +
                (isChinese ? '自定义' : 'Customize') +
              '</button>' +
            '</div>' +
            '<div class="homeui-quick-grid" data-quick-grid></div>' +
          '</section>' +

          '<section class="homeui-res-card">' +
            '<div class="homeui-card-head">' +
              '<h3>' + (isChinese ? '内存与存储状态' : 'Memory & Storage') + '</h3>' +
            '</div>' +
            '<div class="homeui-res-bars">' +
              '<div class="homeui-res-item">' +
                '<div class="homeui-res-row">' +
                  '<span>' + (isChinese ? '已用内存' : 'Memory Used') + '</span>' +
                  '<strong data-res-mem-text>--</strong>' +
                '</div>' +
                '<div class="homeui-res-track">' +
                  '<div class="homeui-res-fill" data-res-mem-bar style="width:25%"></div>' +
                '</div>' +
              '</div>' +
              '<div class="homeui-res-item">' +
                '<div class="homeui-res-row">' +
                  '<span>' + (isChinese ? '磁盘空间' : 'Disk Space') + '</span>' +
                  '<strong data-res-disk-text>--</strong>' +
                '</div>' +
                '<div class="homeui-res-track">' +
                  '<div class="homeui-res-fill is-green" data-res-disk-bar style="width:10%"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</section>' +
        '</aside>' +

        '<section class="homeui-ikuai-right">' +
          '<div class="homeui-monitor-head">' +
            '<h3>' + (isChinese ? '监控信息' : 'Monitoring') + '</h3>' +
          '</div>' +

          '<article class="homeui-chart-box">' +
            '<div class="homeui-chart-top">' +
              '<h4>' + (isChinese ? '上下行速率' : 'Throughput') + '</h4>' +
              '<div class="homeui-chart-tools">' +
                createDropdownHtml('rate-stat', avgLabel, statOpts) +
                createDropdownHtml('rate-iface', isChinese ? '全部' : 'All', ifaceOpts) +
                '<div class="homeui-seg-pills" data-range-group="rate">' +
                  '<button type="button" class="active" data-range="1h">' +
                    (isChinese ? '1小时' : '1H') +
                  '</button>' +
                  '<button type="button" data-range="24h">' +
                    (isChinese ? '24小时' : '24H') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-chart-subaxis">' +
              '<span>' + (isChinese ? '延迟ms' : 'Latency ms') + '</span>' +
              '<span>' + (isChinese ? '速率' : 'Speed') + '</span>' +
            '</div>' +
            '<div class="homeui-svg-holder" data-chart-rate></div>' +
            '<div class="homeui-rate-legend">' +
              '<div class="homeui-rate-legend-left">' +
                '<span class="isp-knot"></span>' +
                '<strong data-rate-ifname>HomeWrt All</strong>' +
              '</div>' +
              '<div class="homeui-rate-legend-metrics">' +
                '<em class="leg-tx">↑ ' + (isChinese ? '上行: ' : 'TX: ') +
                  '<b data-leg-tx>0 B/s</b></em>' +
                '<em class="leg-rx">↓ ' + (isChinese ? '下行: ' : 'RX: ') +
                  '<b data-leg-rx>0 B/s</b></em>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-green-strip"></div>' +
          '</article>' +

          '<article class="homeui-chart-box">' +
            '<div class="homeui-chart-top">' +
              '<h4>' + (isChinese ? '终端数量' : 'Client Count') + '</h4>' +
              '<div class="homeui-chart-tools">' +
                createDropdownHtml('client-stat', avgLabel, statOpts) +
                createDropdownHtml('client-type', isChinese ? '有线' : 'Wired', clientTypeOpts) +
                '<div class="homeui-seg-pills" data-range-group="client">' +
                  '<button type="button" class="active" data-range="1h">' +
                    (isChinese ? '1小时' : '1H') +
                  '</button>' +
                  '<button type="button" data-range="24h">' +
                    (isChinese ? '24小时' : '24H') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-svg-holder" data-chart-clients></div>' +
          '</article>' +

          '<article class="homeui-chart-box">' +
            '<div class="homeui-chart-top">' +
              '<h4>' + (isChinese ? '内存使用率' : 'Memory Usage') + '</h4>' +
              '<div class="homeui-chart-tools">' +
                createDropdownHtml('mem-stat', avgLabel, statOpts) +
                '<div class="homeui-seg-pills" data-range-group="mem">' +
                  '<button type="button" class="active" data-range="1h">' +
                    (isChinese ? '1小时' : '1H') +
                  '</button>' +
                  '<button type="button" data-range="24h">' +
                    (isChinese ? '24小时' : '24H') +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-svg-holder" data-chart-memory></div>' +
          '</article>' +
        '</section>' +
      '</div>' +

      '<section class="homeui-ikuai-bottom">' +
        '<div class="homeui-ikuai-panel">' +
          '<div class="homeui-panel-head">' +
            '<h3>' + (isChinese ? '系统与硬件信息' : 'System & Hardware Info') + '</h3>' +
            '<span class="homeui-panel-badge" data-spec-kernel>Linux</span>' +
          '</div>' +
          '<div class="homeui-spec-wrap" data-spec-grid></div>' +
        '</div>' +

        '<div class="homeui-ikuai-panel">' +
          '<div class="homeui-panel-head">' +
            '<div class="homeui-panel-tabs" data-bottom-tabs>' +
              '<button type="button" class="homeui-panel-tab active" data-btab="leases">' +
                (isChinese ? '在线终端与租约' : 'Active Leases') +
              '</button>' +
              '<button type="button" class="homeui-panel-tab" data-btab="interfaces">' +
                (isChinese ? '网络接口明细' : 'Interfaces') +
              '</button>' +
              '<button type="button" class="homeui-panel-tab" data-btab="storage">' +
                (isChinese ? '内存与挂载分项' : 'Memory & Mounts') +
              '</button>' +
            '</div>' +
            '<span class="homeui-panel-badge" data-lease-count>0</span>' +
          '</div>' +
          '<div data-bottom-tab-body></div>' +
        '</div>' +
      '</section>';

    view.insertBefore(dash, view.firstChild);
    renderQuickGrid(dash);

    var custBtn = dash.querySelector('[data-customize-shortcuts]');
    if (custBtn) {
      custBtn.addEventListener('click', function(ev) {
        ev.preventDefault();
        openShortcutModal(dash);
      });
    }

    var wanSwitch = dash.querySelector('[data-wan-switch]');
    if (wanSwitch) {
      wanSwitch.addEventListener('click', function() {
        liveState.selectedWanIdx = liveState.selectedWanIdx + 1;
        enhanceOverview();
      });
    }

    dash.addEventListener('click', function(ev) {
      var ddBtn = ev.target.closest('[data-dropdown-btn]');
      if (ddBtn) {
        ev.stopPropagation();
        var parentDd = ddBtn.closest('[data-dropdown]');
        var wasOpen = parentDd.classList.contains('is-open');
        Array.prototype.forEach.call(
          dash.querySelectorAll('.homeui-dropdown.is-open'),
          function(d) { d.classList.remove('is-open'); }
        );
        if (!wasOpen)
          parentDd.classList.add('is-open');
        return;
      }

      var optItem = ev.target.closest('[data-opt-val]');
      if (optItem) {
        ev.stopPropagation();
        var dd = optItem.closest('[data-dropdown]');
        var ddId = dd ? dd.dataset.dropdown : '';
        var val = optItem.dataset.optVal;
        var label = optItem.textContent.trim();

        if (dd) {
          dd.classList.remove('is-open');
          var lbl = dd.querySelector('[data-dropdown-label]');
          if (lbl)
            lbl.textContent = label;
          Array.prototype.forEach.call(
            dd.querySelectorAll('.homeui-dropdown-item'),
            function(li) { li.classList.toggle('is-active', li === optItem); }
          );
        }

        if (ddId === 'rate-stat') {
          chartState.rateStat = val;
          renderRateChartSvg(dash);
        } else if (ddId === 'rate-iface') {
          chartState.rateIface = val;
          var host = dash.querySelector('[data-ov-hostname]');
          var hName = host ? host.textContent : 'HomeWrt';
          setText(
            dash,
            '[data-rate-ifname]',
            hName + ' ' + (val === 'all' ? (isChinese ? '全部接口' : 'All') : val)
          );
          renderRateChartSvg(dash);
        } else if (ddId === 'client-stat') {
          chartState.clientStat = val;
          renderClientBarSvg(dash);
        } else if (ddId === 'client-type') {
          chartState.clientType = val;
          renderClientBarSvg(dash);
        } else if (ddId === 'mem-stat') {
          chartState.memStat = val;
          renderMemoryLineSvg(dash);
        }
        return;
      }

      var rangeBtn = ev.target.closest('[data-range]');
      if (rangeBtn) {
        var group = rangeBtn.closest('[data-range-group]');
        var groupName = group ? group.dataset.rangeGroup : '';
        var rng = rangeBtn.dataset.range;
        if (group) {
          Array.prototype.forEach.call(
            group.querySelectorAll('button'),
            function(b) { b.classList.toggle('active', b === rangeBtn); }
          );
        }
        if (groupName === 'rate') {
          chartState.rateRange = rng;
          renderRateChartSvg(dash);
        } else if (groupName === 'client') {
          chartState.clientRange = rng;
          renderClientBarSvg(dash);
        } else if (groupName === 'mem') {
          chartState.memRange = rng;
          renderMemoryLineSvg(dash);
        }
        return;
      }

      var btabBtn = ev.target.closest('[data-btab]');
      if (btabBtn) {
        var tabWrap = btabBtn.closest('[data-bottom-tabs]');
        chartState.bottomTab = btabBtn.dataset.btab;
        if (tabWrap) {
          Array.prototype.forEach.call(
            tabWrap.querySelectorAll('[data-btab]'),
            function(b) { b.classList.toggle('active', b === btabBtn); }
          );
        }
        enhanceOverview();
      }
    });

    document.addEventListener('click', function() {
      Array.prototype.forEach.call(
        dash.querySelectorAll('.homeui-dropdown.is-open'),
        function(d) { d.classList.remove('is-open'); }
      );
    });
  }

  function renderWanMiniWaves(dash, primaryBox)
  {
    if (!dash)
      return;
    var txSvg = dash.querySelector('[data-wan-wave-tx]');
    var rxSvg = dash.querySelector('[data-wan-wave-rx]');
    if (!txSvg && !rxSvg)
      return;

    var ifKey = (primaryBox && (primaryBox.name || primaryBox.title)) || '__total__';
    var curTx = (primaryBox && primaryBox.txSpeed) || liveState.totalTxSpeed || 0;
    var curRx = (primaryBox && primaryBox.rxSpeed) || liveState.totalRxSpeed || 0;

    if (!liveState.wanWaves[ifKey] && !liveState.wanWaves.__total__) {
      var initTxBps = !window.L ? 48 * 1024 : curTx;
      var initRxBps = !window.L ? 136 * 1024 : curRx;
      pushWanWaveSample(ifKey, initTxBps, initRxBps);
    }

    var waveEntry = liveState.wanWaves[ifKey] || liveState.wanWaves.__total__;
    var txArr = waveEntry ? waveEntry.tx.slice() : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var rxArr = waveEntry ? waveEntry.rx.slice() : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var waveTick = (waveEntry && waveEntry.tick) || 1;

    function buildWaveSvgContent(series, gradId, color, phase)
    {
      var w = 210;
      var h = 20;
      var padTop = 3;
      var padBottom = 2;
      var plotLeft = 2;
      var plotRight = w - 3;
      var plotW = plotRight - plotLeft;
      var plotH = h - padTop - padBottom;
      var maxV = Math.max.apply(null, series.concat([512]));
      var minV = Math.min.apply(null, series);
      var span = Math.max(256, maxV - minV * 0.45);

      var coords = series.map(function(rawVal, idx) {
        var val = Math.max(0, Number(rawVal) || 0);
        var x = plotLeft + (plotW * idx) / Math.max(1, series.length - 1);
        var norm;
        if (val <= 0) {
          norm = 0.08 + 0.03 * Math.sin((idx + waveTick) * 0.8 + phase);
        } else {
          var baseRatio = (val - minV * 0.35) / span;
          var liveRipple = 0.05 * Math.sin((idx + waveTick) * 0.9 + phase);
          norm = Math.max(0.16, Math.min(0.98, baseRatio + liveRipple));
        }
        var y = padTop + plotH * (1 - norm);
        return [x, y];
      });

      var d = 'M ' + coords[0][0].toFixed(1) + ' ' + coords[0][1].toFixed(1);
      for (var i = 0; i < coords.length - 1; i++) {
        var p0 = coords[i];
        var p1 = coords[i + 1];
        var cx = ((p0[0] + p1[0]) / 2).toFixed(1);
        d += ' C ' + cx + ' ' + p0[1].toFixed(1) + ', ' +
          cx + ' ' + p1[1].toFixed(1) + ', ' +
          p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
      }

      var lastPt = coords[coords.length - 1];
      var baseY = (padTop + plotH).toFixed(1);
      var area = d +
        ' L ' + lastPt[0].toFixed(1) + ' ' + baseY +
        ' L ' + coords[0][0].toFixed(1) + ' ' + baseY + ' Z';

      return '<defs>' +
        '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.32"/>' +
          '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.02"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<path class="wave-area" d="' + area + '" fill="url(#' + gradId + ')"/>' +
      '<path class="wave-line" d="' + d + '"/>' +
      '<circle cx="' + lastPt[0].toFixed(1) + '" cy="' + lastPt[1].toFixed(1) +
        '" r="1.8" fill="' + color + '"/>';
    }

    if (txSvg)
      txSvg.innerHTML = buildWaveSvgContent(txArr, 'homeuiWanUpGrad', '#6d78f6', 0);
    if (rxSvg)
      rxSvg.innerHTML = buildWaveSvgContent(rxArr, 'homeuiWanDownGrad', '#4cd4a0', 1.6);
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

  function updateBucketSeries(store, slotDurationMs, sample)
  {
    var nowSlot = Math.floor(Date.now() / slotDurationMs);
    var isLiveReady = !window.L || (liveState.pollTicks && liveState.pollTicks >= 1);

    if (!store.seeded) {
      for (var i = 0; i < 12; i++) {
        var wave = 0.85 + ((i % 4) * 0.08);
        var txV = sample.txKB > 0 ? Math.max(1, Math.round(sample.txKB * wave)) : 0;
        var rxV = sample.rxKB > 0 ? Math.max(1, Math.round(sample.rxKB * wave)) : 0;
        store.txAvg[i] = txV;
        store.txPeak[i] = txV > 0 ? Math.max(txV + 4, Math.round(txV * 1.35)) : 0;
        store.rxAvg[i] = rxV;
        store.rxPeak[i] = rxV > 0 ? Math.max(rxV + 6, Math.round(rxV * 1.42)) : 0;

        store.wiredAvg[i] = sample.wired;
        store.wiredPeak[i] = sample.wired + (i % 3 === 0 && sample.wired > 0 ? 1 : 0);
        store.wirelessAvg[i] = sample.wireless;
        store.wirelessPeak[i] = sample.wireless + (i % 4 === 0 && sample.wireless > 0 ? 1 : 0);

        store.memAvg[i] = sample.memPct;
        store.memPeak[i] = Math.min(100, sample.memPct + (i % 3 === 0 ? 3 : 2));
      }
      store.bucketSlot = nowSlot;
      if (isLiveReady)
        store.seeded = true;
    } else if (nowSlot > store.bucketSlot) {
      var steps = Math.min(12, nowSlot - store.bucketSlot);
      for (var s = 0; s < steps; s++) {
        store.txAvg.shift();
        store.txAvg.push(sample.txKB);
        store.txPeak.shift();
        store.txPeak.push(Math.max(sample.txKB, Math.round(sample.txKB * 1.25)));
        store.rxAvg.shift();
        store.rxAvg.push(sample.rxKB);
        store.rxPeak.shift();
        store.rxPeak.push(Math.max(sample.rxKB, Math.round(sample.rxKB * 1.25)));

        store.wiredAvg.shift();
        store.wiredAvg.push(sample.wired);
        store.wiredPeak.shift();
        store.wiredPeak.push(sample.wired);
        store.wirelessAvg.shift();
        store.wirelessAvg.push(sample.wireless);
        store.wirelessPeak.shift();
        store.wirelessPeak.push(sample.wireless);

        store.memAvg.shift();
        store.memAvg.push(sample.memPct);
        store.memPeak.shift();
        store.memPeak.push(sample.memPct);
      }
      store.bucketSlot = nowSlot;
    } else if (isLiveReady) {
      store.txAvg[11] = sample.txKB;
      store.txPeak[11] = Math.max(store.txPeak[11], sample.txKB, store.txAvg[11]);
      store.rxAvg[11] = sample.rxKB;
      store.rxPeak[11] = Math.max(store.rxPeak[11], sample.rxKB, store.rxAvg[11]);

      store.wiredAvg[11] = sample.wired;
      store.wiredPeak[11] = Math.max(store.wiredPeak[11], sample.wired);
      store.wirelessAvg[11] = sample.wireless;
      store.wirelessPeak[11] = Math.max(store.wirelessPeak[11], sample.wireless);

      store.memAvg[11] = sample.memPct;
      store.memPeak[11] = Math.max(store.memPeak[11], sample.memPct);
    }

    if (!store.ifaceSeries)
      store.ifaceSeries = {};

    (sample.ifaces || []).forEach(function(iface) {
      var key = iface.name || iface.title;
      if (!key)
        return;
      var iTx = Math.max(0, Math.round((iface.txSpeed || 0) / 1024));
      var iRx = Math.max(0, Math.round((iface.rxSpeed || 0) / 1024));
      if (!store.ifaceSeries[key] || !isLiveReady) {
        var initTxAvg = [];
        var initTxPeak = [];
        var initRxAvg = [];
        var initRxPeak = [];
        for (var k = 0; k < 12; k++) {
          var w = 0.8 + ((k % 4) * 0.08);
          var baseTx = iTx || Math.round(sample.txKB * w);
          var baseRx = iRx || Math.round(sample.rxKB * w);
          initTxAvg.push(baseTx);
          initTxPeak.push(baseTx > 0 ? Math.max(baseTx + 4, Math.round(baseTx * 1.35)) : 0);
          initRxAvg.push(baseRx);
          initRxPeak.push(baseRx > 0 ? Math.max(baseRx + 6, Math.round(baseRx * 1.4)) : 0);
        }
        store.ifaceSeries[key] = {
          txAvg: initTxAvg,
          txPeak: initTxPeak,
          rxAvg: initRxAvg,
          rxPeak: initRxPeak
        };
      } else {
        var sObj = store.ifaceSeries[key];
        sObj.txAvg[11] = iTx;
        sObj.txPeak[11] = Math.max(sObj.txPeak[11], iTx);
        sObj.rxAvg[11] = iRx;
        sObj.rxPeak[11] = Math.max(sObj.rxPeak[11], iRx);
      }
    });
  }

  function updateOverviewDashboard(view, sectionMap)
  {
    var dash = view.querySelector('.homeui-ikuai-dashboard');
    if (!dash)
      return;

    var sysSec = sectionMap.system;
    var memSec = sectionMap.memory;
    var stoSec = sectionMap.storage;
    var netSec = sectionMap.network;
    var dhcpSec = sectionMap.dhcp;
    var dhcp6Sec = sectionMap.dhcp6;
    var wifiSec = sectionMap.wifi;

    var board = liveState.boardInfo || {};
    var sysInfo = liveState.sysInfo || {};
    var release = board.release || {};

    var hostObj = getRowData(sysSec, [/主机名|hostname/i]);
    var archObj = getRowData(sysSec, [/架构|architecture/i]);
    var modelObj = getRowData(sysSec, [/型号|model/i]);
    var targetObj = getRowData(sysSec, [/目标平台|target/i]);
    var fwObj = getRowData(sysSec, [/固件版本|firmware/i]);
    var kernelObj = getRowData(sysSec, [/内核版本|kernel/i]);
    var timeObj = getRowData(sysSec, [/本地时间|local time/i]);
    var uptimeObj = getRowData(sysSec, [/运行时间|uptime/i]);
    var loadObj = getRowData(sysSec, [/平均负载|load average/i]);
    var cpuObj = getRowData(sysSec, [/CPU.*%|CPU.*usage|CPU\s*使用率/i]);

    if (hostObj.text === '--' && board.hostname)
      hostObj.text = board.hostname;
    if (archObj.text === '--' && board.system)
      archObj.text = board.system;
    if (modelObj.text === '--' && (board.model || board.board_name))
      modelObj.text = board.model || board.board_name;
    if (targetObj.text === '--' && release.target)
      targetObj.text = release.target;
    if (fwObj.text === '--' && (release.description || release.version))
      fwObj.text = release.description ||
        ((release.distribution || 'OpenWrt') + ' ' + release.version);
    if (kernelObj.text === '--' && board.kernel)
      kernelObj.text = board.kernel;
    if (timeObj.text === '--' && sysInfo.localtime)
      timeObj.text = formatUnixLocalTime(sysInfo.localtime);
    if (uptimeObj.text === '--' && typeof sysInfo.uptime === 'number')
      uptimeObj.text = formatUptimeChinese(sysInfo.uptime);
    if (loadObj.text === '--' && Array.isArray(sysInfo.load) && sysInfo.load.length >= 3) {
      loadObj.text = [
        (sysInfo.load[0] / 65536).toFixed(2),
        (sysInfo.load[1] / 65536).toFixed(2),
        (sysInfo.load[2] / 65536).toFixed(2)
      ].join(', ');
    }

    var memUsedObj = getRowData(memSec, [/已使用|已用|used/i]);
    var diskObj = getRowData(stoSec, [/磁盘空间|disk space|overlay|root/i]);
    var connObj = getRowData(netSec, [/活动连接|连接|active.*connection/i]);
    var onlineObj = getRowData(netSec, [/在线用户|online.*user/i]);

    if (memUsedObj.text === '--' && liveState.memDetail) {
      memUsedObj.text = liveState.memDetail;
      memUsedObj.percent = liveState.memPct;
    }
    if (diskObj.text === '--' && liveState.diskDetail) {
      diskObj.text = liveState.diskDetail;
      diskObj.percent = liveState.diskPct;
    }

    var previewStats = view.querySelectorAll('.preview-stat strong');
    if (uptimeObj.text === '--' && previewStats.length >= 3) {
      uptimeObj.text = previewStats[0].textContent.trim();
      connObj.text = previewStats[1].textContent.trim();
      memUsedObj.text = previewStats[2].textContent.trim();
      memUsedObj.percent = parseFloat(memUsedObj.text) || 26;
    }

    var hostname = hostObj.text !== '--' ? hostObj.text : 'HomeWrt';
    var uptimeFormatted = formatUptimeChinese(uptimeObj.text);
    setText(
      dash,
      '[data-ov-uptime]',
      (isChinese ? '系统运行时间: ' : 'Uptime: ') + uptimeFormatted
    );
    setText(dash, '[data-ov-hostname]', hostname);

    var gwidText = archObj.text !== '--' ? archObj.text :
      (modelObj.text !== '--' ? modelObj.text : 'x86_64 Gateway');
    setText(dash, '[data-ov-gwid]', gwidText);

    var tipEl = dash.querySelector('[data-ov-tip]');
    if (tipEl && fwObj.text !== '--')
      tipEl.title = fwObj.text;

    if (fwObj.text !== '--') {
      var verMatch = fwObj.text.match(/\d+\.\d+(?:\.\d+)?/);
      if (verMatch)
        setText(dash, '[data-ov-ver]', verMatch[0]);
    }

    var cpuPct = cpuObj.percent !== null ? Math.round(cpuObj.percent) :
      (Array.isArray(sysInfo.load) && sysInfo.load.length ?
        Math.min(100, Math.max(2, Math.round((sysInfo.load[0] / 65536) * 25))) : 5);
    var diskPct = diskObj.percent !== null ? Math.round(diskObj.percent) :
      (liveState.diskPct !== null ? liveState.diskPct : 8);
    var memPct = memUsedObj.percent !== null ?
      Math.round(memUsedObj.percent) :
      (liveState.memPct !== null ? liveState.memPct : 25);

    setDonutProgress(
      dash.querySelector('[data-ring-card="cpu"]'),
      cpuPct,
      cpuPct + '%'
    );
    setText(dash, '[data-ov-cpu-stat]', cpuPct + '%');
    setText(dash, '[data-ov-disk-stat]', diskPct + '%');

    setText(dash, '[data-res-mem-text]', memUsedObj.text !== '--' ? memUsedObj.text : (memPct + '%'));
    setText(dash, '[data-res-disk-text]', diskObj.text !== '--' ? diskObj.text : (diskPct + '%'));
    var memBar = dash.querySelector('[data-res-mem-bar]');
    var diskBar = dash.querySelector('[data-res-disk-bar]');
    if (memBar)
      memBar.style.width = Math.max(4, Math.min(100, memPct)) + '%';
    if (diskBar)
      diskBar.style.width = Math.max(4, Math.min(100, diskPct)) + '%';

    var domLeases = extractLeaseRows([
      { el: dhcpSec, type: isChinese ? '有线 (DHCPv4)' : 'Wired (DHCPv4)' },
      { el: dhcp6Sec, type: isChinese ? '有线 (DHCPv6)' : 'Wired (DHCPv6)' },
      { el: wifiSec, type: isChinese ? '无线 (Wi-Fi)' : 'Wireless' }
    ]);

    var mergedLeases = [];
    var seenLeaseKey = {};
    domLeases.concat(liveState.rpcLeases || []).forEach(function(item) {
      var k = (item.mac && item.mac !== '--') ?
        item.mac.toUpperCase() : item.ip;
      if (!k || seenLeaseKey[k])
        return;
      seenLeaseKey[k] = true;
      mergedLeases.push(item);
    });
    liveState.leases = mergedLeases;

    var dhcpCount = mergedLeases.length;
    var onlineCount = parseInt(onlineObj.text, 10);
    if (isNaN(onlineCount) || onlineCount <= 0)
      onlineCount = dhcpCount > 0 ? dhcpCount : 6;

    var wirelessCount = liveState.wirelessClients || 0;
    var wiredCount = Math.max(0, onlineCount - wirelessCount);
    liveState.wiredClients = wiredCount;
    liveState.totalClients = onlineCount;

    setDonutProgress(
      dash.querySelector('[data-ring-card="clients"]'),
      Math.min(100, Math.max(10, onlineCount * 5)),
      onlineCount
    );
    setText(dash, '[data-ov-wifi-stat]', wirelessCount);
    setText(dash, '[data-ov-wired-stat]', wiredCount);

    var connCount = liveState.connTotal || 0;
    if (!connCount) {
      var connSource = connObj.title || connObj.text || '';
      var connMatch = connSource.match(/(\d+)/);
      if (connMatch)
        connCount = parseInt(connMatch[1], 10);
    }
    if (!connCount)
      connCount = 246;

    var tcpCount = liveState.connTotal ?
      liveState.tcpCount : Math.round(connCount * 0.80);
    var udpCount = liveState.connTotal ?
      liveState.udpCount : Math.round(connCount * 0.17);
    var icmpCount = liveState.connTotal ?
      liveState.icmpCount : Math.max(0, connCount - tcpCount - udpCount);

    setDonutProgress(
      dash.querySelector('[data-ring-card="conns"]'),
      Math.min(100, Math.max(12, Math.round(connCount / 20))),
      connCount
    );
    setText(dash, '[data-ov-tcp-stat]', tcpCount);
    setText(dash, '[data-ov-udp-stat]', udpCount);
    setText(dash, '[data-ov-icmp-stat]', icmpCount);

    var netBoxes = extractNetworkBoxes(netSec);
    var allIfaces = liveState.ifaces.length ? liveState.ifaces : netBoxes;
    updateIfaceDropdownMenu(dash, allIfaces);

    var primaryBox = allIfaces[liveState.selectedWanIdx % Math.max(1, allIfaces.length)] ||
      allIfaces[0] || {
        name: 'lan',
        title: 'wan / br-lan',
        proto: 'STATIC',
        addr: '10.10.10.2',
        gw: '10.10.10.1',
        uptime: uptimeFormatted
      };

    var cleanIp = (primaryBox.addr || '10.10.10.2').split('/')[0];
    setText(dash, '[data-ov-ip]', cleanIp);
    setText(dash, '[data-wan-switch]', primaryBox.title || primaryBox.name || 'wan / br-lan');

    var legendIfLabel = chartState.rateIface === 'all' ?
      (isChinese ? '全部接口' : 'All') : chartState.rateIface;
    setText(dash, '[data-rate-ifname]', hostname + ' ' + legendIfLabel);

    setText(dash, '[data-wan-ip]', cleanIp);
    setText(dash, '[data-wan-proto]', String(primaryBox.proto || 'STATIC').toUpperCase());
    setText(dash, '[data-wan-gw]', primaryBox.gw || '10.10.10.1');
    setText(
      dash,
      '[data-wan-uptime]',
      formatUptimeChinese(primaryBox.uptime || uptimeObj.text)
    );

    if (loadObj.text !== '--')
      setText(dash, '[data-wan-load]', loadObj.text);

    var curTxSpeed = primaryBox.txSpeed || liveState.totalTxSpeed || 0;
    var curRxSpeed = primaryBox.rxSpeed || liveState.totalRxSpeed || 0;
    var curTotalBytes = (primaryBox.rxBytes || 0) + (primaryBox.txBytes || 0) ||
      liveState.totalBytes;

    if (curTotalBytes > 0) {
      setText(dash, '[data-wan-total]', formatBytes(curTotalBytes));
      setText(dash, '[data-wan-tx]', formatRate(curTxSpeed));
      setText(dash, '[data-wan-rx]', formatRate(curRxSpeed));
    } else if (primaryBox.rxText || primaryBox.txText) {
      setText(dash, '[data-wan-total]', '12.48 GB');
      setText(dash, '[data-wan-tx]', primaryBox.txText || '48.20 KB/s');
      setText(dash, '[data-wan-rx]', primaryBox.rxText || '136.50 KB/s');
    }

    var isMockPreview = !window.L;
    var txKB = curTxSpeed > 0 ?
      Math.max(1, Math.round(curTxSpeed / 1024)) :
      (isMockPreview ? 48 : 0);
    var rxKB = curRxSpeed > 0 ?
      Math.max(1, Math.round(curRxSpeed / 1024)) :
      (isMockPreview ? 136 : 0);

    var sample = {
      txKB: txKB,
      rxKB: rxKB,
      wired: wiredCount,
      wireless: wirelessCount,
      memPct: memPct,
      ifaces: allIfaces
    };

    updateBucketSeries(historyState.h1, 5 * 60 * 1000, sample);
    updateBucketSeries(historyState.h24, 2 * 3600 * 1000, sample);
    saveHistoryState();

    renderWanMiniWaves(dash, primaryBox);
    renderRateChartSvg(dash);
    renderClientBarSvg(dash);
    renderMemoryLineSvg(dash);

    if (kernelObj.text !== '--')
      setText(dash, '[data-spec-kernel]', 'Linux ' + kernelObj.text);

    var specGrid = dash.querySelector('[data-spec-grid]');
    if (specGrid) {
      var domSysRows = extractAllKeyValues(sysSec).filter(function(r) {
        return r.value && r.value !== '--';
      });

      var fallbackPairs = [
        {
          key: isChinese ? '主机名' : 'Hostname',
          value: hostname
        },
        {
          key: isChinese ? '设备型号' : 'Model',
          value: modelObj.text !== '--' ? modelObj.text : 'x86_64 Generic'
        },
        {
          key: isChinese ? '目标平台' : 'Target Platform',
          value: targetObj.text !== '--' ? targetObj.text : 'x86/64'
        },
        {
          key: isChinese ? '内核版本' : 'Kernel Version',
          value: kernelObj.text !== '--' ? kernelObj.text : '6.6.x'
        },
        {
          key: isChinese ? '本地时间' : 'Local Time',
          value: timeObj.text !== '--' ? timeObj.text : formatUnixLocalTime(Date.now() / 1000)
        },
        {
          key: isChinese ? '运行时间' : 'Uptime',
          value: uptimeFormatted
        },
        {
          key: isChinese ? '平均负载' : 'Load Average',
          value: loadObj.text !== '--' ? loadObj.text : '0.08, 0.05, 0.01'
        },
        {
          key: isChinese ? 'CPU 状态' : 'CPU Usage',
          value: cpuObj.text !== '--' ? cpuObj.text : (cpuPct + '%')
        },
        {
          key: isChinese ? '处理器架构' : 'Architecture',
          value: archObj.text !== '--' ? archObj.text : 'x86_64 Multi-Core Processor'
        },
        {
          key: isChinese ? '固件版本' : 'Firmware Version',
          value: fwObj.text !== '--' ? fwObj.text : 'ImmortalWrt 25.12-SNAPSHOT'
        }
      ];

      var sysRows = domSysRows.length >= 4 ? domSysRows : fallbackPairs;
      var compactRows = [];
      var wideRows = [];

      sysRows.forEach(function(r) {
        var isWide = r.value.length > 34 || /固件|架构|firmware|arch/i.test(r.key);
        if (isWide)
          wideRows.push(r);
        else
          compactRows.push(r);
      });

      var trHtml = '';
      for (var c = 0; c < compactRows.length; c += 2) {
        var left = compactRows[c];
        var right = compactRows[c + 1];
        if (right) {
          trHtml += '<tr>' +
            '<th>' + escapeHtml(left.key) + '</th>' +
            '<td title="' + escapeHtml(left.value) + '">' + escapeHtml(left.value) + '</td>' +
            '<th>' + escapeHtml(right.key) + '</th>' +
            '<td title="' + escapeHtml(right.value) + '">' + escapeHtml(right.value) + '</td>' +
          '</tr>';
        } else {
          trHtml += '<tr>' +
            '<th>' + escapeHtml(left.key) + '</th>' +
            '<td colspan="3" title="' + escapeHtml(left.value) + '">' +
              escapeHtml(left.value) +
            '</td>' +
          '</tr>';
        }
      }

      wideRows.forEach(function(wRow) {
        trHtml += '<tr>' +
          '<th>' + escapeHtml(wRow.key) + '</th>' +
          '<td colspan="3" title="' + escapeHtml(wRow.value) + '">' +
            escapeHtml(wRow.value) +
          '</td>' +
        '</tr>';
      });

      specGrid.innerHTML =
        '<table class="homeui-spec-table">' +
          '<tbody>' + trHtml + '</tbody>' +
        '</table>';
    }

    var domStorage = extractAllKeyValues(memSec).concat(
      extractAllKeyValues(stoSec)
    );
    liveState.storageRows = domStorage.length ?
      domStorage : (liveState.rpcStorageRows || []);
    renderBottomRightPanel(dash, netBoxes);
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

  function prepareRoutesUnits(view)
  {
    Array.prototype.forEach.call(
      view.querySelectorAll('.cbi-tabmenu'),
      function(tm) { tm.classList.add('homeui-sec-hidden'); }
    );

    Array.prototype.forEach.call(
      view.querySelectorAll('.cbi-section[data-tab]'),
      function(pane) {
        pane.classList.add('homeui-routes-tabpane');
        pane.setAttribute('data-tab-active', 'true');
        pane.style.display = '';
      }
    );

    var headings = view.querySelectorAll('h3');
    Array.prototype.forEach.call(headings, function(h3) {
      if (h3.closest('.homeui-subpage-card') ||
          h3.closest('.homeui-subpage-shell'))
        return;
      var parent = h3.parentNode;
      if (!parent)
        return;
      if (parent.classList.contains('cbi-section') &&
          !parent.hasAttribute('data-tab') &&
          parent.querySelectorAll('h3').length === 1) {
        parent.classList.add('homeui-subpage-card', 'homeui-fw-unit');
        return;
      }

      var card = document.createElement('section');
      card.className = 'homeui-subpage-card homeui-fw-unit';
      parent.insertBefore(card, h3);
      var cur = h3;
      while (cur) {
        var next = cur.nextSibling;
        card.appendChild(cur);
        if (!next || (next.nodeType === 1 && /^H[234]$/i.test(next.tagName)))
          break;
        cur = next;
      }
    });

    return view.querySelectorAll('.homeui-fw-unit');
  }

  function enhanceRoutesPage(view)
  {
    if (!view.querySelector('.table, table, .cbi-section'))
      return;

    var units = prepareRoutesUnits(view);
    if (!units.length)
      return;

    var counts = {
      arp: 0,
      v4route: 0,
      v6route: 0,
      v6neigh: 0,
      rule: 0
    };

    var catTagLabels = {
      arp: 'IPv4 ARP',
      v4route: 'IPv4 Route',
      v6route: 'IPv6 Route',
      v6neigh: 'IPv6 NDP',
      rule: 'Policy Rule'
    };

    Array.prototype.forEach.call(units, function(sec, idx) {
      var title = getSectionHeadingText(sec);
      var lower = title.toLowerCase();
      var cat = 'v4route';

      if (/arp|ipv4.*邻居|ipv4.*neigh/i.test(lower))
        cat = 'arp';
      else if (/ipv6.*路由|ipv6.*route/i.test(lower))
        cat = 'v6route';
      else if (/ipv6.*邻居|ipv6.*neigh|ndp/i.test(lower))
        cat = 'v6neigh';
      else if (/规则|策略|rule/i.test(lower))
        cat = 'rule';
      else if (/ipv4.*路由|ipv4.*route|active.*route/i.test(lower))
        cat = 'v4route';
      else if (idx === 0)
        cat = 'arp';

      var rCount = countValidSectionRows(sec);
      sec.dataset.homeuiCat = cat;
      sec.dataset.homeuiRows = String(rCount);
      sec.dataset.homeuiTitle = title;
      counts[cat] = (counts[cat] || 0) + rCount;

      var h = sec.querySelector('h3, h4, .cbi-section-title');
      if (h) {
        var catBadge = h.querySelector('.homeui-sec-cat');
        if (!catBadge) {
          catBadge = document.createElement('span');
          catBadge.className = 'homeui-sec-cat is-' + cat;
          h.insertBefore(catBadge, h.firstChild);
        }
        catBadge.textContent = catTagLabels[cat] || 'Route';

        var badge = h.querySelector('.homeui-sec-count');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'homeui-sec-count';
          h.appendChild(badge);
        }
        badge.textContent = rCount + (isChinese ? ' 条记录' : ' entries');
      }
    });

    var totalEntries = counts.arp + counts.v4route + counts.v6route +
      counts.v6neigh + counts.rule;

    var shell = view.querySelector('.homeui-subpage-shell');
    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'homeui-subpage-shell';
      shell.innerHTML =
        '<div class="homeui-subpage-metrics">' +
          '<div class="homeui-subpage-metric is-blue">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? 'ARP 邻居表' : 'ARP Neighbors') + '</span>' +
              '<strong data-rt-metric="arp">0</strong>' +
              '<small>' + (isChinese ? 'IPv4 局域网活跃 MAC 映射' : 'Active IPv4 MAC mappings') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-green">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3m6 11H7l3 3"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? 'IPv4 活动路由' : 'IPv4 Active Routes') + '</span>' +
              '<strong data-rt-metric="v4route">0</strong>' +
              '<small>' + (isChinese ? '当前生效的 IPv4 路由表项' : 'Active IPv4 routing entries') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-purple">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? 'IPv6 活动路由' : 'IPv6 Active Routes') + '</span>' +
              '<strong data-rt-metric="v6route">0</strong>' +
              '<small>' + (isChinese ? '当前生效的 IPv6 路由表项' : 'Active IPv6 routing entries') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-orange">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? 'IPv6 邻居发现' : 'IPv6 Neighbors') + '</span>' +
              '<strong data-rt-metric="v6neigh">0</strong>' +
              '<small>' + (isChinese ? 'NDP 邻居发现缓存条目' : 'NDP neighbor cache') + '</small>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="homeui-subpage-bar">' +
          '<div class="homeui-subpage-tabs" data-rt-tabs>' +
            '<button type="button" class="homeui-subpage-tab is-active" data-rt-tab="all">' +
              (isChinese ? '全部视图' : 'All Tables') +
              ' <em class="tab-count" data-rt-cnt="all">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-rt-tab="arp">' +
              (isChinese ? 'ARP 邻居' : 'ARP') +
              ' <em class="tab-count" data-rt-cnt="arp">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-rt-tab="v4route">' +
              (isChinese ? 'IPv4 路由' : 'IPv4 Routes') +
              ' <em class="tab-count" data-rt-cnt="v4route">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-rt-tab="v6route">' +
              (isChinese ? 'IPv6 路由' : 'IPv6 Routes') +
              ' <em class="tab-count" data-rt-cnt="v6route">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-rt-tab="v6neigh">' +
              (isChinese ? 'IPv6 邻居' : 'IPv6 Neighbors') +
              ' <em class="tab-count" data-rt-cnt="v6neigh">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-rt-tab="rule">' +
              (isChinese ? '策略规则' : 'Rules') +
              ' <em class="tab-count" data-rt-cnt="rule">0</em>' +
            '</button>' +
          '</div>' +
          '<div class="homeui-subpage-toolbar">' +
            '<label class="homeui-subpage-search">' +
              '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>' +
              '<input type="search" data-rt-search placeholder="' +
                (isChinese ? '搜索 IP / MAC / 接口 / 网关...' : 'Filter IP, MAC, interface...') +
              '">' +
            '</label>' +
          '</div>' +
        '</div>';

      view.insertBefore(shell, view.firstChild);

      shell.addEventListener('click', function(ev) {
        var tabBtn = ev.target.closest('[data-rt-tab]');
        if (!tabBtn)
          return;
        subpageState.routesTab = tabBtn.dataset.rtTab;
        Array.prototype.forEach.call(
          shell.querySelectorAll('[data-rt-tab]'),
          function(b) { b.classList.toggle('is-active', b === tabBtn); }
        );
        applySubpageFilter(view, subpageState.routesTab, subpageState.routesQuery, false);
      });

      var searchIn = shell.querySelector('[data-rt-search]');
      if (searchIn) {
        searchIn.addEventListener('input', function() {
          subpageState.routesQuery = searchIn.value;
          applySubpageFilter(view, subpageState.routesTab, subpageState.routesQuery, false);
        });
      }
    }

    setText(shell, '[data-rt-metric="arp"]', counts.arp);
    setText(shell, '[data-rt-metric="v4route"]', counts.v4route);
    setText(shell, '[data-rt-metric="v6route"]', counts.v6route);
    setText(shell, '[data-rt-metric="v6neigh"]', counts.v6neigh);

    setText(shell, '[data-rt-cnt="all"]', totalEntries);
    setText(shell, '[data-rt-cnt="arp"]', counts.arp);
    setText(shell, '[data-rt-cnt="v4route"]', counts.v4route);
    setText(shell, '[data-rt-cnt="v6route"]', counts.v6route);
    setText(shell, '[data-rt-cnt="v6neigh"]', counts.v6neigh);
    setText(shell, '[data-rt-cnt="rule"]', counts.rule);

    applySubpageFilter(view, subpageState.routesTab, subpageState.routesQuery, false);
  }

  function prepareFirewallUnits(view)
  {
    var nftTables = view.querySelectorAll('.nft-table');
    if (nftTables.length) {
      Array.prototype.forEach.call(nftTables, function(nt) {
        var topSec = nt.querySelector(':scope > .cbi-section');
        if (topSec && !topSec.classList.contains('nft-chain')) {
          topSec.classList.add('homeui-nft-table-head');
          topSec.classList.remove('homeui-fw-unit');
        }
        var tableTitle = topSec ? getSectionHeadingText(topSec) : '';
        var chains = nt.querySelectorAll('.nft-chain');
        Array.prototype.forEach.call(chains, function(ch) {
          ch.classList.add('homeui-fw-unit', 'homeui-subpage-card');
          if (tableTitle)
            ch.dataset.homeuiTableTitle = tableTitle;
        });
      });
      return view.querySelectorAll('.homeui-fw-unit');
    }

    var sections = view.querySelectorAll('.cbi-section');
    Array.prototype.forEach.call(sections, function(sec) {
      if (sec.classList.contains('homeui-nft-table-head'))
        return;
      var h4s = sec.querySelectorAll('h4');
      if (h4s.length <= 1) {
        sec.classList.add('homeui-fw-unit', 'homeui-subpage-card');
        return;
      }

      var tableTitle = getSectionHeadingText(sec);
      Array.prototype.forEach.call(h4s, function(h4) {
        var parent = h4.parentNode;
        if (!parent)
          return;
        if (parent.classList.contains('homeui-fw-unit'))
          return;
        if (parent !== sec && parent.querySelectorAll('h4').length === 1) {
          parent.classList.add('homeui-fw-unit', 'homeui-subpage-card');
          if (tableTitle)
            parent.dataset.homeuiTableTitle = tableTitle;
          return;
        }
        var wrapper = document.createElement('div');
        wrapper.className = 'homeui-fw-unit homeui-subpage-card';
        if (tableTitle)
          wrapper.dataset.homeuiTableTitle = tableTitle;
        parent.insertBefore(wrapper, h4);
        var cur = h4;
        while (cur) {
          var next = cur.nextSibling;
          wrapper.appendChild(cur);
          if (!next || (next.nodeType === 1 && /^H[34]$/i.test(next.tagName)))
            break;
          cur = next;
        }
      });
    });

    return view.querySelectorAll('.homeui-fw-unit');
  }

  function enhanceFirewallStatusPage(view)
  {
    var sections = view.querySelectorAll('.cbi-section, .nft-chain');
    if (!sections.length)
      return;

    var mainEl = document.querySelector('#maincontent');
    if (mainEl) {
      var legacyWarn = mainEl.querySelector(':scope > .alert-message.warning');
      if (legacyWarn)
        legacyWarn.classList.add('homeui-legacy-fw-banner');
    }

    var units = prepareFirewallUnits(view);
    if (!units.length)
      units = view.querySelectorAll('.cbi-section:not(.homeui-nft-table-head)');

    var totalChains = units.length;
    var totalRules = 0;
    var acceptRules = 0;
    var dropRules = 0;
    var catCounts = {
      all: 0,
      filter: 0,
      nat: 0,
      mangle: 0
    };

    var fwCatLabels = {
      filter: 'FILTER',
      nat: 'NAT',
      mangle: 'MANGLE'
    };

    Array.prototype.forEach.call(units, function(sec) {
      var title = getSectionHeadingText(sec);
      var tableTitle = sec.dataset.homeuiTableTitle || '';
      var hookEl = sec.querySelector('.nft-chain-hook');
      var hookTxt = hookEl ? hookEl.textContent : '';
      var combined = (tableTitle + ' ' + title + ' ' + hookTxt).toLowerCase();
      var cat = 'filter';

      if (/mangle|raw|mssfix|mark|-150|-300/i.test(combined))
        cat = 'mangle';
      else if (/nat|masquerade|dstnat|srcnat|-100|\b100\b/i.test(combined))
        cat = 'nat';

      var rCount = countValidSectionRows(sec);
      sec.dataset.homeuiCat = cat;
      sec.dataset.homeuiRows = String(rCount);
      sec.dataset.homeuiTitle = title;

      totalRules += rCount;
      catCounts.all += rCount;
      catCounts[cat] = (catCounts[cat] || 0) + rCount;

      var rows = sec.querySelectorAll(
        '.table .tr:not(.table-titles):not(.cbi-section-table-titles), ' +
        'table tbody tr'
      );
      Array.prototype.forEach.call(rows, function(r) {
        if (r.classList.contains('cbi-section-table-titles') ||
            r.classList.contains('table-titles'))
          return;
        var txt = r.textContent.toLowerCase();
        if (!txt || /没有|无|no\s+rules|empty/i.test(txt))
          return;
        if (/\b(drop|reject)\b|丢弃|拒绝/.test(txt))
          dropRules++;
        else if (/\b(accept|masquerade|dnat|snat|redirect|jump|goto)\b|接受|放行|转发|跳转/.test(txt))
          acceptRules++;
      });

      var h = sec.querySelector('h4, h3, .cbi-section-title');
      if (h) {
        var catBadge = h.querySelector('.homeui-sec-cat');
        if (!catBadge) {
          catBadge = document.createElement('span');
          catBadge.className = 'homeui-sec-cat is-' + cat;
          h.insertBefore(catBadge, h.firstChild);
        }
        catBadge.textContent = fwCatLabels[cat] || 'CHAIN';

        var badge = h.querySelector('.homeui-sec-count');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'homeui-sec-count';
          h.appendChild(badge);
        }
        badge.textContent = rCount + (isChinese ? ' 条规则' : ' rules');
      }
    });

    if (totalRules === 0)
      subpageState.fwHideEmpty = false;

    var shell = view.querySelector('.homeui-subpage-shell');
    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'homeui-subpage-shell';
      shell.innerHTML =
        '<div class="homeui-subpage-metrics">' +
          '<div class="homeui-subpage-metric is-blue">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '生效规则总数' : 'Active Rules') + '</span>' +
              '<strong data-fw-metric="total">0</strong>' +
              '<small>' + (isChinese ? '当前防火墙状态表内生效规则' : 'Active firewall rules in tables') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-purple">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '规则链数量' : 'Rule Chains') + '</span>' +
              '<strong data-fw-metric="chains">0</strong>' +
              '<small>' + (isChinese ? '包含 Filter / NAT / Mangle 链' : 'Filter, NAT & Mangle chains') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-green">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '放行与转换策略' : 'Accept & NAT Rules') + '</span>' +
              '<strong data-fw-metric="accept">0</strong>' +
              '<small>' + (isChinese ? '允许通行、端口转发与地址伪装' : 'Accept, DNAT, SNAT & Masquerade') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-orange">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '阻断与丢弃策略' : 'Drop & Reject Rules') + '</span>' +
              '<strong data-fw-metric="drop">0</strong>' +
              '<small>' + (isChinese ? '安全拦截、丢弃与拒绝连接策略' : 'Blocked and rejected traffic rules') + '</small>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="homeui-subpage-bar">' +
          '<div class="homeui-subpage-tabs" data-fw-tabs>' +
            '<button type="button" class="homeui-subpage-tab is-active" data-fw-tab="all">' +
              (isChinese ? '全部规则链' : 'All Chains') +
              ' <em class="tab-count" data-fw-cnt="all">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-fw-tab="filter">' +
              (isChinese ? '访问过滤 (Filter)' : 'Filter') +
              ' <em class="tab-count" data-fw-cnt="filter">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-fw-tab="nat">' +
              (isChinese ? '地址转换 (NAT)' : 'NAT') +
              ' <em class="tab-count" data-fw-cnt="nat">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-fw-tab="mangle">' +
              (isChinese ? '流量标记 (Mangle/Raw)' : 'Mangle/Raw') +
              ' <em class="tab-count" data-fw-cnt="mangle">0</em>' +
            '</button>' +
          '</div>' +
          '<div class="homeui-subpage-toolbar">' +
            '<button type="button" class="homeui-filter-pill' +
              (subpageState.fwHideEmpty ? ' is-active' : '') +
              '" data-fw-hide-empty>' +
              (isChinese ? '隐藏空规则链' : 'Hide Empty Chains') +
            '</button>' +
            '<label class="homeui-subpage-search">' +
              '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>' +
              '<input type="search" data-fw-search placeholder="' +
                (isChinese ? '搜索规则链 / 端口 / IP / 动作...' : 'Filter chain, port, IP, action...') +
              '">' +
            '</label>' +
          '</div>' +
        '</div>';

      view.insertBefore(shell, view.firstChild);

      shell.addEventListener('click', function(ev) {
        var tabBtn = ev.target.closest('[data-fw-tab]');
        if (tabBtn) {
          subpageState.fwTab = tabBtn.dataset.fwTab;
          Array.prototype.forEach.call(
            shell.querySelectorAll('[data-fw-tab]'),
            function(b) { b.classList.toggle('is-active', b === tabBtn); }
          );
          applySubpageFilter(
            view,
            subpageState.fwTab,
            subpageState.fwQuery,
            subpageState.fwHideEmpty
          );
          return;
        }

        var emptyBtn = ev.target.closest('[data-fw-hide-empty]');
        if (emptyBtn) {
          subpageState.fwHideEmpty = !subpageState.fwHideEmpty;
          emptyBtn.classList.toggle('is-active', subpageState.fwHideEmpty);
          applySubpageFilter(
            view,
            subpageState.fwTab,
            subpageState.fwQuery,
            subpageState.fwHideEmpty
          );
        }
      });

      var searchIn = shell.querySelector('[data-fw-search]');
      if (searchIn) {
        searchIn.addEventListener('input', function() {
          subpageState.fwQuery = searchIn.value;
          applySubpageFilter(
            view,
            subpageState.fwTab,
            subpageState.fwQuery,
            subpageState.fwHideEmpty
          );
        });
      }
    }

    setText(shell, '[data-fw-metric="total"]', totalRules);
    setText(shell, '[data-fw-metric="chains"]', totalChains);
    setText(shell, '[data-fw-metric="accept"]', acceptRules);
    setText(shell, '[data-fw-metric="drop"]', dropRules);

    setText(shell, '[data-fw-cnt="all"]', catCounts.all);
    setText(shell, '[data-fw-cnt="filter"]', catCounts.filter);
    setText(shell, '[data-fw-cnt="nat"]', catCounts.nat);
    setText(shell, '[data-fw-cnt="mangle"]', catCounts.mangle);

    applySubpageFilter(
      view,
      subpageState.fwTab,
      subpageState.fwQuery,
      subpageState.fwHideEmpty
    );
  }

  function getCellText(container, selector)
  {
    if (!container)
      return '';
    var el = container.querySelector(selector);
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function enhanceRealtimePage(view, page)
  {
    var sections = view.querySelectorAll('.cbi-section');
    if (!sections.length)
      return;

    var rtMode = 'load';
    if (view.querySelector('#rx_bw_cur') || /bandwidth/i.test(page))
      rtMode = 'bandwidth';
    else if (view.querySelector('#lb_udp_cur, #connections') || /connections/i.test(page))
      rtMode = 'connections';
    else if (view.querySelector('#rssi_bw_cur') || /wireless/i.test(page))
      rtMode = 'wireless';

    Array.prototype.forEach.call(sections, function(sec) {
      var svgBoxes = sec.querySelectorAll(
        ':scope > div[style*="height:300px"], :scope > .homeui-rt-chart-box'
      );
      Array.prototype.forEach.call(svgBoxes, function(box) {
        box.classList.add('homeui-rt-chart-box');
      });

      var firstBox = svgBoxes[0];
      if (!firstBox)
        return;

      var head = sec.querySelector(':scope > .homeui-rt-card-head');
      if (!head) {
        var ifTitle = sec.getAttribute('data-tab-title') ||
          sec.getAttribute('data-tab') || '';
        var catTag = 'LOAD';
        var catCls = '';
        var titleTxt = isChinese ?
          '系统平均负载实时趋势 (1m / 5m / 15m)' :
          'System Load Average Realtime Trend';
        var legendHtml =
          '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#2f89ff"></i>' +
            (isChinese ? '1 分钟' : '1 Min') + '</span>' +
          '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#28c76f"></i>' +
            (isChinese ? '5 分钟' : '5 Min') + '</span>' +
          '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#f59f00"></i>' +
            (isChinese ? '15 分钟' : '15 Min') + '</span>';

        if (rtMode === 'bandwidth') {
          catTag = 'TRAFFIC';
          catCls = ' is-green';
          titleTxt = (isChinese ? '接口实时吞吐速率' : 'Realtime Interface Bandwidth') +
            (ifTitle ? ' — ' + ifTitle : '');
          legendHtml =
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#2f89ff"></i>' +
              (isChinese ? '入站 (RX)' : 'Inbound (RX)') + '</span>' +
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#28c76f"></i>' +
              (isChinese ? '出站 (TX)' : 'Outbound (TX)') + '</span>';
        } else if (rtMode === 'connections') {
          catTag = 'CONNTRACK';
          catCls = ' is-purple';
          titleTxt = isChinese ?
            '活动连接协议实时分布趋势' :
            'Active Connections Realtime Trend';
          legendHtml =
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#2f89ff"></i>TCP</span>' +
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#28c76f"></i>UDP</span>' +
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#f59f00"></i>' +
              (isChinese ? '其他' : 'Other') + '</span>';
        } else if (rtMode === 'wireless') {
          catTag = 'RADIO';
          catCls = ' is-orange';
          titleTxt = (isChinese ? '无线信号与物理层速率趋势' : 'Wireless Signal & PHY Rate') +
            (ifTitle ? ' — ' + ifTitle : '');
          legendHtml =
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#2f89ff"></i>' +
              (isChinese ? '信号 (RSSI)' : 'Signal') + '</span>' +
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#f59f00"></i>' +
              (isChinese ? '底噪 (Noise)' : 'Noise') + '</span>' +
            '<span class="homeui-rt-legend-item"><i class="homeui-rt-legend-dot" style="background:#28c76f"></i>' +
              (isChinese ? '速率 (Rate)' : 'PHY Rate') + '</span>';
        }

        head = document.createElement('div');
        head.className = 'homeui-rt-card-head';
        head.innerHTML =
          '<div class="homeui-rt-card-title">' +
            '<span class="homeui-sec-cat' + catCls + '">' + catTag + '</span>' +
            '<span>' + escapeHtml(titleTxt) + '</span>' +
          '</div>' +
          '<div class="homeui-rt-card-meta">' +
            legendHtml +
            '<span class="homeui-rt-scale-pill" data-rt-scale>-</span>' +
          '</div>';
        sec.insertBefore(head, firstBox);
      }

      var scaleTxt = getCellText(sec, '#scale');
      if (scaleTxt && scaleTxt !== '-')
        setText(head, '[data-rt-scale]', scaleTxt.replace(/^\(|\)$/g, ''));
      else
        setText(head, '[data-rt-scale]', isChinese ? '最近 3 分钟信息，每 3 秒刷新' : '3m window, 3s interval');
    });

    var mainEl = document.querySelector('#maincontent') || view.parentNode;
    var shell = mainEl ? mainEl.querySelector('.homeui-rt-shell') : null;
    if (!shell && mainEl) {
      shell = document.createElement('div');
      shell.className = 'homeui-subpage-shell homeui-rt-shell';
      shell.innerHTML =
        '<div class="homeui-subpage-metrics">' +
          '<div class="homeui-subpage-metric is-blue">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span data-rt-label="1">--</span>' +
              '<strong data-rt-val="1">--</strong>' +
              '<small data-rt-sub="1">--</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-green">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M12 3v14m0 0-5-5m5 5 5-5M5 21h14"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span data-rt-label="2">--</span>' +
              '<strong data-rt-val="2">--</strong>' +
              '<small data-rt-sub="2">--</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-purple">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M12 17V3m0 0-5 5m5-5 5 5M5 21h14"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span data-rt-label="3">--</span>' +
              '<strong data-rt-val="3">--</strong>' +
              '<small data-rt-sub="3">--</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-orange">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span data-rt-label="4">--</span>' +
              '<strong data-rt-val="4">--</strong>' +
              '<small data-rt-sub="4">--</small>' +
            '</div>' +
          '</div>' +
        '</div>';

      var topTabs = mainEl.querySelector(':scope > .tabs');
      if (topTabs)
        mainEl.insertBefore(shell, topTabs);
      else
        mainEl.insertBefore(shell, view);
    }

    if (!shell)
      return;

    var activeSec = view.querySelector('.cbi-section[data-tab-active="true"]') ||
      sections[0];

    if (rtMode === 'load') {
      var l1Cur = getCellText(activeSec, '#lb_load01_cur') || '0.00';
      var l1Avg = getCellText(activeSec, '#lb_load01_avg') || '0.00';
      var l1Peak = getCellText(activeSec, '#lb_load01_peak') || '0.00';
      var l5Cur = getCellText(activeSec, '#lb_load05_cur') || '0.00';
      var l5Avg = getCellText(activeSec, '#lb_load05_avg') || '0.00';
      var l5Peak = getCellText(activeSec, '#lb_load05_peak') || '0.00';
      var l15Cur = getCellText(activeSec, '#lb_load15_cur') || '0.00';
      var l15Avg = getCellText(activeSec, '#lb_load15_avg') || '0.00';
      var l15Peak = getCellText(activeSec, '#lb_load15_peak') || '0.00';
      var maxPeak = Math.max(
        parseFloat(l1Peak) || 0,
        parseFloat(l5Peak) || 0,
        parseFloat(l15Peak) || 0
      ).toFixed(2);

      setText(shell, '[data-rt-label="1"]', isChinese ? '1 分钟平均负载' : '1 Minute Load');
      setText(shell, '[data-rt-val="1"]', l1Cur);
      setText(shell, '[data-rt-sub="1"]', (isChinese ? '均值: ' : 'Avg: ') + l1Avg + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + l1Peak);

      setText(shell, '[data-rt-label="2"]', isChinese ? '5 分钟平均负载' : '5 Minute Load');
      setText(shell, '[data-rt-val="2"]', l5Cur);
      setText(shell, '[data-rt-sub="2"]', (isChinese ? '均值: ' : 'Avg: ') + l5Avg + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + l5Peak);

      setText(shell, '[data-rt-label="3"]', isChinese ? '15 分钟平均负载' : '15 Minute Load');
      setText(shell, '[data-rt-val="3"]', l15Cur);
      setText(shell, '[data-rt-sub="3"]', (isChinese ? '均值: ' : 'Avg: ') + l15Avg + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + l15Peak);

      setText(shell, '[data-rt-label="4"]', isChinese ? '窗口最高负载峰值' : 'Window Peak Load');
      setText(shell, '[data-rt-val="4"]', maxPeak);
      setText(shell, '[data-rt-sub="4"]', isChinese ? '最近 3 分钟采样最高负载' : 'Highest load in 3m window');
    } else if (rtMode === 'bandwidth') {
      var activeIfName = activeSec.getAttribute('data-tab-title') ||
        activeSec.getAttribute('data-tab') || 'eth0';
      var rxCur = getCellText(activeSec, '#rx_bw_cur') || '0 B/s';
      var rxAvg = getCellText(activeSec, '#rx_bw_avg') || '0 B/s';
      var rxPeak = getCellText(activeSec, '#rx_bw_peak') || '0 B/s';
      var txCur = getCellText(activeSec, '#tx_bw_cur') || '0 B/s';
      var txAvg = getCellText(activeSec, '#tx_bw_avg') || '0 B/s';
      var txPeak = getCellText(activeSec, '#tx_bw_peak') || '0 B/s';

      var shortRate = function(s) {
        return String(s || '').replace(/\s*\([^)]*\)/, '').trim() || '0 B/s';
      };

      setText(shell, '[data-rt-label="1"]', isChinese ? '当前监控接口' : 'Active Interface');
      setText(shell, '[data-rt-val="1"]', activeIfName);
      setText(shell, '[data-rt-sub="1"]', (isChinese ? '在线物理接口总数: ' : 'Active interfaces: ') + sections.length);

      setText(shell, '[data-rt-label="2"]', isChinese ? '实时入站速率 (RX)' : 'Inbound Rate (RX)');
      setText(shell, '[data-rt-val="2"]', shortRate(rxCur));
      setText(shell, '[data-rt-sub="2"]', (isChinese ? '平均: ' : 'Avg: ') + shortRate(rxAvg) + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + shortRate(rxPeak));

      setText(shell, '[data-rt-label="3"]', isChinese ? '实时出站速率 (TX)' : 'Outbound Rate (TX)');
      setText(shell, '[data-rt-val="3"]', shortRate(txCur));
      setText(shell, '[data-rt-sub="3"]', (isChinese ? '平均: ' : 'Avg: ') + shortRate(txAvg) + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + shortRate(txPeak));

      setText(shell, '[data-rt-label="4"]', isChinese ? '最高吞吐峰值' : 'Peak Throughput');
      setText(shell, '[data-rt-val="4"]', shortRate(rxPeak));
      setText(shell, '[data-rt-sub="4"]', (isChinese ? '出站峰值: ' : 'Peak TX: ') + shortRate(txPeak));
    } else if (rtMode === 'connections') {
      var udpCur = getCellText(activeSec, '#lb_udp_cur') || '0';
      var udpAvg = getCellText(activeSec, '#lb_udp_avg') || '0';
      var udpPeak = getCellText(activeSec, '#lb_udp_peak') || '0';
      var tcpCur = getCellText(activeSec, '#lb_tcp_cur') || '0';
      var tcpAvg = getCellText(activeSec, '#lb_tcp_avg') || '0';
      var tcpPeak = getCellText(activeSec, '#lb_tcp_peak') || '0';
      var otrCur = getCellText(activeSec, '#lb_otr_cur') || '0';
      var otrAvg = getCellText(activeSec, '#lb_otr_avg') || '0';
      var otrPeak = getCellText(activeSec, '#lb_otr_peak') || '0';
      var sumConns = (parseInt(udpCur, 10) || 0) +
        (parseInt(tcpCur, 10) || 0) +
        (parseInt(otrCur, 10) || 0);

      setText(shell, '[data-rt-label="1"]', isChinese ? '实时活动连接总数' : 'Active Connections');
      setText(shell, '[data-rt-val="1"]', String(sumConns));
      setText(shell, '[data-rt-sub="1"]', isChinese ? '当前实时追踪网络会话总数' : 'Total active conntrack sessions');

      setText(shell, '[data-rt-label="2"]', isChinese ? 'TCP 活动连接' : 'TCP Connections');
      setText(shell, '[data-rt-val="2"]', tcpCur);
      setText(shell, '[data-rt-sub="2"]', (isChinese ? '均值: ' : 'Avg: ') + tcpAvg + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + tcpPeak);

      setText(shell, '[data-rt-label="3"]', isChinese ? 'UDP 活动连接' : 'UDP Connections');
      setText(shell, '[data-rt-val="3"]', udpCur);
      setText(shell, '[data-rt-sub="3"]', (isChinese ? '均值: ' : 'Avg: ') + udpAvg + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + udpPeak);

      setText(shell, '[data-rt-label="4"]', isChinese ? '其他协议连接' : 'Other Protocols');
      setText(shell, '[data-rt-val="4"]', otrCur);
      setText(shell, '[data-rt-sub="4"]', (isChinese ? '均值: ' : 'Avg: ') + otrAvg + ' · ' + (isChinese ? '峰值: ' : 'Peak: ') + otrPeak);
    } else if (rtMode === 'wireless') {
      var wifiName = activeSec.getAttribute('data-tab-title') ||
        activeSec.getAttribute('data-tab') || 'wlan0';
      var rssiCur = getCellText(activeSec, '#rssi_bw_cur') || '0 dBm';
      var rssiAvg = getCellText(activeSec, '#rssi_bw_avg') || '0 dBm';
      var noiseCur = getCellText(activeSec, '#noise_bw_cur') || '0 dBm';
      var noiseAvg = getCellText(activeSec, '#noise_bw_avg') || '0 dBm';
      var rateCur = getCellText(activeSec, '#rate_bw_cur') || '0 Mbit/s';
      var ratePeak = getCellText(activeSec, '#rate_bw_peak') || '0 Mbit/s';

      setText(shell, '[data-rt-label="1"]', isChinese ? '当前无线接口' : 'Wireless Interface');
      setText(shell, '[data-rt-val="1"]', wifiName);
      setText(shell, '[data-rt-sub="1"]', isChinese ? '实时射频信号与速率监控' : 'Realtime radio signal & rate');

      setText(shell, '[data-rt-label="2"]', isChinese ? '实时信号强度 (RSSI)' : 'Signal Strength');
      setText(shell, '[data-rt-val="2"]', rssiCur);
      setText(shell, '[data-rt-sub="2"]', (isChinese ? '平均信号: ' : 'Avg RSSI: ') + rssiAvg);

      setText(shell, '[data-rt-label="3"]', isChinese ? '实时底噪水平 (Noise)' : 'Noise Floor');
      setText(shell, '[data-rt-val="3"]', noiseCur);
      setText(shell, '[data-rt-sub="3"]', (isChinese ? '平均底噪: ' : 'Avg Noise: ') + noiseAvg);

      setText(shell, '[data-rt-label="4"]', isChinese ? '物理层速率 (PHY)' : 'PHY Rate');
      setText(shell, '[data-rt-val="4"]', rateCur);
      setText(shell, '[data-rt-sub="4"]', (isChinese ? '峰值速率: ' : 'Peak Rate: ') + ratePeak);
    }
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

  function prepareWireguardUnits(view)
  {
    var headings = view.querySelectorAll('h3');
    Array.prototype.forEach.call(headings, function(h3) {
      if (h3.closest('.homeui-wg-card') || h3.closest('.homeui-subpage-shell'))
        return;
      var parent = h3.parentNode;
      if (!parent)
        return;
      if (parent.classList.contains('cbi-section') &&
          parent.querySelectorAll('h3').length === 1) {
        parent.classList.add('homeui-subpage-card', 'homeui-wg-card', 'homeui-fw-unit');
        return;
      }

      var card = document.createElement('section');
      card.className = 'cbi-section homeui-subpage-card homeui-wg-card homeui-fw-unit';
      parent.insertBefore(card, h3);
      var cur = h3;
      while (cur) {
        var next = cur.nextSibling;
        card.appendChild(cur);
        if (!next || (next.nodeType === 1 && /^H[23]$/i.test(next.tagName)))
          break;
        cur = next;
      }
    });

    return view.querySelectorAll('.homeui-wg-card');
  }

  function applyWireguardFilter(view, tabVal, query)
  {
    var q = (query || '').trim().toLowerCase();
    var cards = view.querySelectorAll('.homeui-wg-card');

    Array.prototype.forEach.call(cards, function(card) {
      var rows = card.querySelectorAll(
        '.table .tr:not(.table-titles):not(.cbi-section-table-titles):not(.placeholder)'
      );
      if (!rows.length) {
        card.classList.toggle('homeui-sec-hidden', tabVal !== 'all');
        return;
      }

      var cardTitle = (card.dataset.homeuiTitle || '').toLowerCase();
      var visibleCount = 0;

      Array.prototype.forEach.call(rows, function(row) {
        var status = row.dataset.wgStatus || 'offline';
        var tabMatch = tabVal === 'all' || status === tabVal;
        var textMatch = !q ||
          cardTitle.includes(q) ||
          row.textContent.toLowerCase().includes(q);
        var show = tabMatch && textMatch;
        row.style.display = show ? '' : 'none';
        if (show)
          visibleCount++;
      });

      card.classList.toggle('homeui-sec-hidden', visibleCount === 0);
    });
  }

  function enhanceWireguardPage(view)
  {
    var cards = prepareWireguardUnits(view);
    var instanceCount = cards.length;
    var totalPeers = 0;
    var onlinePeers = 0;
    var offlinePeers = 0;
    var totalRxBytes = 0;
    var totalTxBytes = 0;

    Array.prototype.forEach.call(cards, function(card) {
      var title = getSectionHeadingText(card);
      card.dataset.homeuiTitle = title;

      var infoP = card.querySelector(':scope > p');
      if (infoP)
        infoP.classList.add('homeui-wg-instance-bar');

      var rows = card.querySelectorAll(
        '.table .tr:not(.table-titles):not(.cbi-section-table-titles):not(.placeholder)'
      );
      var cardPeers = 0;

      Array.prototype.forEach.call(rows, function(row) {
        var txt = row.textContent.trim();
        if (!txt || /没有|无.*对端|no\s+peers/i.test(txt))
          return;
        cardPeers++;
        totalPeers++;

        var cells = row.querySelectorAll('.td');
        var rxTxt = cells[2] ? cells[2].textContent.trim() : '';
        var txTxt = cells[3] ? cells[3].textContent.trim() : '';
        var hsTxt = cells[4] ? cells[4].textContent.trim() : '';

        totalRxBytes += parseSizeStringToBytes(rxTxt);
        totalTxBytes += parseSizeStringToBytes(txTxt);

        var isOnline = Boolean(hsTxt) && !/从未|never|^-$|^0\s*s?$/i.test(hsTxt);
        row.dataset.wgStatus = isOnline ? 'online' : 'offline';
        if (isOnline)
          onlinePeers++;
        else
          offlinePeers++;
      });

      var h = card.querySelector('h3');
      if (h) {
        var catBadge = h.querySelector('.homeui-sec-cat');
        if (!catBadge) {
          catBadge = document.createElement('span');
          catBadge.className = 'homeui-sec-cat';
          h.insertBefore(catBadge, h.firstChild);
        }
        catBadge.textContent = 'WIREGUARD';

        var countBadge = h.querySelector('.homeui-sec-count');
        if (!countBadge) {
          countBadge = document.createElement('span');
          countBadge.className = 'homeui-sec-count';
          h.appendChild(countBadge);
        }
        countBadge.textContent = cardPeers + (isChinese ? ' 个对端' : ' peers');
      }
    });

    var mainEl = document.querySelector('#maincontent') || view.parentNode;
    var shell = mainEl ? mainEl.querySelector('.homeui-wg-shell') : null;
    if (!shell && mainEl) {
      shell = document.createElement('div');
      shell.className = 'homeui-subpage-shell homeui-wg-shell';
      shell.innerHTML =
        '<div class="homeui-subpage-metrics">' +
          '<div class="homeui-subpage-metric is-blue">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? 'WireGuard 实例' : 'WG Instances') + '</span>' +
              '<strong data-wg-metric="instances">0</strong>' +
              '<small>' + (isChinese ? '当前运行中的加密隧道接口' : 'Active WireGuard tunnel interfaces') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-purple">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '对端节点总数' : 'Total Peers') + '</span>' +
              '<strong data-wg-metric="peers">0</strong>' +
              '<small>' + (isChinese ? '已配置的对端 (Peers) 节点' : 'Configured WireGuard peers') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-green">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '在线握手节点' : 'Active Handshakes') + '</span>' +
              '<strong data-wg-metric="online">0</strong>' +
              '<small>' + (isChinese ? '已完成密钥交换的活跃节点' : 'Peers with active handshake') + '</small>' +
            '</div>' +
          '</div>' +
          '<div class="homeui-subpage-metric is-orange">' +
            '<div class="metric-icon">' +
              '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>' +
            '</div>' +
            '<div class="metric-meta">' +
              '<span>' + (isChinese ? '累计隧道总流量' : 'Total Tunnel Traffic') + '</span>' +
              '<strong data-wg-metric="traffic">0 B</strong>' +
              '<small data-wg-metric="traffic-sub">↓ 0 B · ↑ 0 B</small>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="homeui-subpage-bar">' +
          '<div class="homeui-subpage-tabs" data-wg-tabs>' +
            '<button type="button" class="homeui-subpage-tab is-active" data-wg-tab="all">' +
              (isChinese ? '全部对端' : 'All Peers') +
              ' <em class="tab-count" data-wg-cnt="all">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-wg-tab="online">' +
              (isChinese ? '已握手在线' : 'Online') +
              ' <em class="tab-count" data-wg-cnt="online">0</em>' +
            '</button>' +
            '<button type="button" class="homeui-subpage-tab" data-wg-tab="offline">' +
              (isChinese ? '未握手离线' : 'Offline') +
              ' <em class="tab-count" data-wg-cnt="offline">0</em>' +
            '</button>' +
          '</div>' +
          '<div class="homeui-subpage-toolbar">' +
            '<label class="homeui-subpage-search">' +
              '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>' +
              '<input type="search" data-wg-search placeholder="' +
                (isChinese ? '搜索实例 / 对端名称 / 端点 IP / 公钥...' : 'Filter instance, peer, endpoint...') +
              '">' +
            '</label>' +
          '</div>' +
        '</div>';

      mainEl.insertBefore(shell, view);

      shell.addEventListener('click', function(ev) {
        var tabBtn = ev.target.closest('[data-wg-tab]');
        if (!tabBtn)
          return;
        subpageState.wgTab = tabBtn.dataset.wgTab;
        Array.prototype.forEach.call(
          shell.querySelectorAll('[data-wg-tab]'),
          function(b) { b.classList.toggle('is-active', b === tabBtn); }
        );
        applyWireguardFilter(view, subpageState.wgTab, subpageState.wgQuery);
      });

      var searchIn = shell.querySelector('[data-wg-search]');
      if (searchIn) {
        searchIn.addEventListener('input', function() {
          subpageState.wgQuery = searchIn.value;
          applyWireguardFilter(view, subpageState.wgTab, subpageState.wgQuery);
        });
      }
    }

    if (!shell)
      return;

    setText(shell, '[data-wg-metric="instances"]', instanceCount);
    setText(shell, '[data-wg-metric="peers"]', totalPeers);
    setText(shell, '[data-wg-metric="online"]', onlinePeers);
    setText(shell, '[data-wg-metric="traffic"]', formatBytes(totalRxBytes + totalTxBytes));
    setText(
      shell,
      '[data-wg-metric="traffic-sub"]',
      '↓ ' + formatBytes(totalRxBytes) + ' · ↑ ' + formatBytes(totalTxBytes)
    );

    setText(shell, '[data-wg-cnt="all"]', totalPeers);
    setText(shell, '[data-wg-cnt="online"]', onlinePeers);
    setText(shell, '[data-wg-cnt="offline"]', offlinePeers);

    applyWireguardFilter(view, subpageState.wgTab, subpageState.wgQuery);
  }

  var isEnhancing = false;

  function enhanceOverview()
  {
    var page = resolveCurrentPageId();
    if (isEnhancing)
      return;

    var view = document.querySelector('#view') ||
      document.querySelector('#maincontent');
    if (!view)
      return;

    if (page === 'admin-status-routes') {
      isEnhancing = true;
      try {
        enhanceRoutesPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page === 'admin-status-nftables' || page === 'admin-status-iptables') {
      isEnhancing = true;
      try {
        enhanceFirewallStatusPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (/^admin-status-realtime/.test(page)) {
      isEnhancing = true;
      try {
        enhanceRealtimePage(view, page);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page === 'admin-status-wireguard') {
      isEnhancing = true;
      try {
        enhanceWireguardPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page !== 'admin-status-overview')
      return;

    isEnhancing = true;
    try {
      var names = [
        'system',
        'memory',
        'storage',
        'ports',
        'network',
        'dhcp',
        'dhcp6',
        'wifi'
      ];
      var allSections = view.querySelectorAll('.cbi-section');
      var sectionMap = {};

      if (!view.querySelector('.homeui-ikuai-dashboard'))
        createIkuaiDashboard(view);

      Array.prototype.forEach.call(allSections, function(section, index) {
        if (section.closest('.homeui-ikuai-dashboard'))
          return;
        var name = getOverviewSectionName(section, names[index]);
        section.classList.add('homeui-overview-card');
        if (name) {
          section.classList.add('homeui-overview-' + name);
          if (!sectionMap[name])
            sectionMap[name] = section;
        }
      });

      updateOverviewDashboard(view, sectionMap);
    } finally {
      isEnhancing = false;
    }
  }

  if (collapseButton)
    collapseButton.addEventListener('click', toggleSidebar);

  if (topMenu)
    topMenu.addEventListener('click', expandSidebarOnMenuClick);

  if (searchTrigger)
    searchTrigger.addEventListener('click', openSearchModal);

  document.addEventListener('keydown', function(ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      openSearchModal();
    }
  });

  if (colorButton) {
    colorButton.addEventListener('click', function() {
      var current = root.dataset.colorMode || 'auto';
      var next = current === 'auto' ? 'light' :
        (current === 'light' ? 'dark' : 'auto');
      applyColorMode(next);
    });
  }

  darkQuery.addEventListener('change', function() {
    if ((root.dataset.colorMode || 'auto') === 'auto')
      applyColorMode('auto');
  });

  if (indicators) {
    new MutationObserver(labelIndicators).observe(indicators, {
      childList: true,
      subtree: true
    });
  }

  new MutationObserver(function(mutations) {
    var shouldUpdate = mutations.some(function(m) {
      return !m.target.closest ||
        (!m.target.closest('.homeui-ikuai-dashboard') &&
         !m.target.closest('.homeui-subpage-shell') &&
         !m.target.closest('.homeui-rt-card-head') &&
         !m.target.classList.contains('homeui-sec-count') &&
         !m.target.classList.contains('homeui-sec-cat'));
    });
    if (shouldUpdate)
      enhanceOverview();
  }).observe(
    document.querySelector('#maincontent') || document.body,
    { childList: true, subtree: true, characterData: true }
  );

  if (isOverview) {
    pollLiveRouterStats(enhanceOverview);
    setTimeout(function() {
      pollLiveRouterStats(enhanceOverview);
    }, 1000);
    setInterval(function() {
      pollLiveRouterStats(enhanceOverview);
    }, 3000);
  } else if (isRoutesPage || isFirewallStatusPage || isRealtimePage || isWireguardPage) {
    setInterval(enhanceOverview, 1000);
  }

  window.addEventListener('load', enhanceOverview);
  applyColorMode(root.dataset.colorMode || 'auto');
  labelIndicators();
  enhanceOverview();
})();
