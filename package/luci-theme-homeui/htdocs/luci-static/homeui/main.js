(function() {
  'use strict';

  var root = document.documentElement;
  var collapseButton = document.querySelector('#homeui-collapse');
  var colorButton = document.querySelector('#homeui-color-toggle');
  var colorLabel = document.querySelector('.homeui-color-label');
  var topMenu = document.querySelector('#topmenu');
  var indicators = document.querySelector('#indicators');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

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

      if (!/refresh|刷新/i.test(label) &&
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

  function getOverviewValue(section, patterns)
  {
    var rows;

    if (!section)
      return '--';

    rows = section.querySelectorAll('.tr');

    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('.td');
      var label = cells.length ? cells[0].textContent.trim() : '';

      if (!patterns.some(function(pattern) {
        return pattern.test(label);
      }))
        continue;

      if (cells.length > 1) {
        var value = cells[cells.length - 1].textContent.trim();
        var progress = cells[cells.length - 1].querySelector(
          '.cbi-progressbar'
        );

        if (value)
          return value;

        if (progress)
          return progress.title || '--';
      }
    }

    return '--';
  }

  function createOverviewMetric(key, label)
  {
    var metric = document.createElement('article');
    var icon = document.createElement('span');
    var copy = document.createElement('span');
    var value = document.createElement('strong');
    var caption = document.createElement('small');
    var icons = {
      cpu: '<rect x="5" y="5" width="14" height="14" rx="3"/>' +
        '<path d="M9 9h6v6H9zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3' +
        'm14-6h3m-3 6h3"/>',
      memory: '<path d="M5 4v16m14-16v16M8 7h8M8 11h8M8 15h5"/>',
      uptime: '<circle cx="12" cy="12" r="9"/>' +
        '<path d="M12 7v5l3 2"/>',
      clients: '<circle cx="9" cy="8" r="3"/>' +
        '<path d="M3 20v-2a5 5 0 0 1 10 0v2M16 5a3 3 0 0 1 0 6' +
        'm1 4a5 5 0 0 1 4 5"/>'
    };

    metric.className = 'homeui-overview-metric metric-' + key;
    metric.dataset.metric = key;
    icon.className = 'homeui-overview-metric-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      icons[key] + '</svg>';
    copy.className = 'homeui-overview-metric-copy';
    value.textContent = '--';
    caption.textContent = label;
    copy.appendChild(value);
    copy.appendChild(caption);
    metric.appendChild(icon);
    metric.appendChild(copy);
    return metric;
  }

  function createOverviewHeader(view)
  {
    var language = document.documentElement.lang.toLowerCase();
    var isChinese = language.startsWith('zh');
    var hero = document.createElement('section');
    var heading = document.createElement('div');
    var eyebrow = document.createElement('span');
    var title = document.createElement('h1');
    var subtitle = document.createElement('p');
    var status = document.createElement('span');
    var metrics = document.createElement('div');
    var labels = isChinese ? {
      cpu: 'CPU 使用率',
      memory: '已用内存',
      uptime: '运行时间',
      clients: '在线用户'
    } : {
      cpu: 'CPU usage',
      memory: 'Memory used',
      uptime: 'Uptime',
      clients: 'Online clients'
    };

    hero.className = 'homeui-overview-hero';
    heading.className = 'homeui-overview-hero-copy';
    eyebrow.className = 'homeui-overview-eyebrow';
    eyebrow.textContent = 'HOMEWRT SYSTEM';
    title.textContent = 'HomeWrt';
    title.dataset.overviewHostname = '';
    subtitle.textContent = isChinese ?
      '设备与网络运行状态一览' :
      'Device and network health at a glance';
    status.className = 'homeui-overview-health';
    status.textContent = isChinese ? '运行正常' : 'Healthy';
    heading.appendChild(eyebrow);
    heading.appendChild(title);
    heading.appendChild(subtitle);
    hero.appendChild(heading);
    hero.appendChild(status);

    metrics.className = 'homeui-overview-metrics';
    Object.keys(labels).forEach(function(key) {
      metrics.appendChild(createOverviewMetric(key, labels[key]));
    });

    view.insertBefore(metrics, view.firstChild);
    view.insertBefore(hero, metrics);
  }

  function setOverviewText(element, value)
  {
    if (element && element.textContent !== value)
      element.textContent = value;
  }

  function getOverviewSectionName(section, fallback)
  {
    var heading = section.querySelector('.cbi-title h3');
    var title = heading ? heading.textContent.toLowerCase() : '';
    var rules = [
      ['memory', /内存|memory/],
      ['storage', /存储|storage|mount/],
      ['ports', /端口|port/],
      ['dhcp', /dhcp|租约/],
      ['dns', /dns/],
      ['dsl', /dsl/],
      ['wifi', /wifi|wireless|无线/],
      ['network', /网络|network/],
      ['system', /系统|system/]
    ];

    for (var i = 0; i < rules.length; i++) {
      if (rules[i][1].test(title))
        return rules[i][0];
    }

    return fallback;
  }

  function updateOverviewHeader(view, sections)
  {
    var system = sections[0];
    var memory = sections[1];
    var network = sections[4];
    var values = {
      cpu: getOverviewValue(system, [/CPU.*%/i, /CPU.*usage/i]),
      memory: getOverviewValue(memory, [/已使用/, /used/i]),
      uptime: getOverviewValue(system, [/运行时间/, /uptime/i]),
      clients: getOverviewValue(network, [/在线用户/, /active.*user/i])
    };
    var hostname = getOverviewValue(system, [/主机名/, /hostname/i]);

    if (hostname !== '--') {
      setOverviewText(
        view.querySelector('[data-overview-hostname]'),
        hostname
      );
    }

    Object.keys(values).forEach(function(key) {
      var metric = view.querySelector('[data-metric="' + key + '"]');

      if (metric)
        setOverviewText(metric.querySelector('strong'), values[key]);
    });
  }

  function enhanceOverview()
  {
    var page = document.body.dataset.page || '';

    if (page !== 'admin-status-overview')
      return;

    var view = document.querySelector('#view');

    if (!view)
      return;

    var names = [
      'system',
      'memory',
      'storage',
      'ports',
      'network',
      'dhcp',
      'dsl',
      'wifi'
    ];
    var sections = view.querySelectorAll(':scope > .cbi-section');

    view.classList.add('homeui-overview-grid');

    if (!view.querySelector('.homeui-overview-hero'))
      createOverviewHeader(view);

    Array.prototype.forEach.call(sections, function(section, index) {
      var name = getOverviewSectionName(section, names[index]);

      section.classList.add('homeui-overview-card');

      if (name)
        section.classList.add('homeui-overview-' + name);
    });

    updateOverviewHeader(view, sections);
  }

  if (collapseButton)
    collapseButton.addEventListener('click', toggleSidebar);

  if (topMenu)
    topMenu.addEventListener('click', expandSidebarOnMenuClick);

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

  new MutationObserver(enhanceOverview).observe(
    document.querySelector('#maincontent') || document.body,
    { childList: true, subtree: true }
  );

  applyColorMode(root.dataset.colorMode || 'auto');
  labelIndicators();
  enhanceOverview();
})();
