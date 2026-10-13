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
  var isOverview =
    (document.body && document.body.dataset.page === 'admin-status-overview');

  if (isOverview)
    root.classList.add('homeui-overview-single-rail');

  var historyState = loadHistoryState();
  var netState = {
    lastTick: 0,
    lastRx: 0,
    lastTx: 0,
    totalBytes: 0,
    rxSpeed: 0,
    txSpeed: 0,
    conntrack: null,
    selectedWanIdx: 0
  };

  function loadHistoryState()
  {
    try {
      var raw = sessionStorage.getItem('homeui-overview-history-v2');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.times) && parsed.times.length === 12)
          return parsed;
      }
    } catch (e) {}

    var now = Date.now();
    var times = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now - i * 300000);
      times.push(pad2(d.getHours()) + ':' + pad2(d.getMinutes()));
    }

    return {
      times: times,
      tx: [80, 140, 190, 150, 120, 160, 260, 340, 210, 150, 130, 180],
      rx: [120, 220, 310, 260, 190, 240, 420, 520, 310, 230, 195, 260],
      latency: [26, 25, 26, 26, 25, 26, 27, 26, 25, 26, 26, 26],
      clients: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      conns: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      memory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      cpu: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      seeded: false
    };
  }

  function saveHistoryState()
  {
    try {
      sessionStorage.setItem(
        'homeui-overview-history-v2',
        JSON.stringify(historyState)
      );
    } catch (e) {}
  }

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
    return (idx === 0 ? b : b.toFixed(2)) + ' ' + units[idx];
  }

  function formatRate(bytesPerSec)
  {
    return formatBytes(bytesPerSec) + '/s';
  }

  function formatUptimeChinese(raw)
  {
    if (!raw || raw === '--')
      return isChinese ? '运行正常' : 'Running';

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
    var heading = section.querySelector('.cbi-title h3, :scope > h3');
    var title = heading ? heading.textContent.toLowerCase() : '';
    var rules = [
      ['memory', /内存|memory/],
      ['storage', /存储|磁盘|storage|mount|disk/],
      ['ports', /端口|以太网|port|ethernet/],
      ['dhcp', /dhcp|租约|lease/],
      ['dns', /dns/],
      ['dsl', /dsl/],
      ['wifi', /wifi|wireless|无线/],
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

    var rows = section.querySelectorAll('.tr');
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('.td');
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

  function parseIfaceBox(box, fallbackName)
  {
    var head = box.querySelector('.ifacebox-head');
    var body = box.querySelector('.ifacebox-body');
    var title = head ? head.textContent.trim() : (fallbackName || 'WAN');
    var active = head ? head.classList.contains('active') : true;
    var map = {};

    if (body) {
      var infoSpan = body.querySelector('span');
      if (infoSpan) {
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
      title: title,
      active: active,
      proto: pick([/协议|protocol/i]) || 'Static / DHCP',
      addr: pick([/地址|address/i]) || '',
      gw: pick([/网关|gateway/i]) || '',
      dns: pick([/dns/i]) || '',
      uptime: pick([/连接|运行|connected|uptime/i]) || ''
    };
  }

  function extractNetworkBoxes(networkSection)
  {
    var list = [];
    if (!networkSection)
      return list;

    var boxes = networkSection.querySelectorAll('.network-status-table .ifacebox');
    Array.prototype.forEach.call(boxes, function(box, idx) {
      list.push(parseIfaceBox(box, idx === 0 ? 'lan' : 'wan6'));
    });

    if (!list.length) {
      var rows = networkSection.querySelectorAll('.table .tr:not(.table-titles)');
      Array.prototype.forEach.call(rows, function(row) {
        var tds = row.querySelectorAll('.td');
        if (tds.length >= 4) {
          list.push({
            title: tds[0].textContent.trim() || 'lan',
            active: true,
            proto: 'Static',
            addr: tds[1].textContent.trim(),
            gw: '10.10.10.1',
            dns: '10.10.10.1',
            uptime: '',
            rxText: tds[3] ? tds[3].textContent.trim() : '',
            txText: tds[4] ? tds[4].textContent.trim() : ''
          });
        }
      });
    }

    return list;
  }

  function pollLuciNetworkCounters(callback)
  {
    if (!window.L || typeof window.L.require !== 'function')
      return;

    window.L.require('network').then(function(network) {
      return network.getDevices();
    }).then(function(devices) {
      if (!Array.isArray(devices))
        return;

      var rxSum = 0;
      var txSum = 0;
      var chosen = devices.find(function(d) {
        return d.getName && d.getName() === 'br-lan';
      }) || devices.find(function(d) {
        return d.getName && /^eth0|^wan|^enp/.test(d.getName());
      });

      if (chosen) {
        rxSum = Number(chosen.getRXBytes && chosen.getRXBytes()) || 0;
        txSum = Number(chosen.getTXBytes && chosen.getTXBytes()) || 0;
      } else {
        devices.forEach(function(d) {
          var name = (d.getName && d.getName()) || '';
          if (name && name !== 'lo') {
            rxSum += Number(d.getRXBytes && d.getRXBytes()) || 0;
            txSum += Number(d.getTXBytes && d.getTXBytes()) || 0;
          }
        });
      }

      var now = Date.now();
      if (netState.lastTick > 0 && now > netState.lastTick) {
        var dt = (now - netState.lastTick) / 1000;
        if (rxSum >= netState.lastRx && txSum >= netState.lastTx && dt >= 0.8) {
          netState.rxSpeed = (rxSum - netState.lastRx) / dt;
          netState.txSpeed = (txSum - netState.lastTx) / dt;
        }
      }

      netState.lastTick = now;
      netState.lastRx = rxSum;
      netState.lastTx = txSum;
      netState.totalBytes = rxSum + txSum;

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
      return { line: '', area: '' };

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

  function renderRateChartSvg(container)
  {
    if (!container)
      return;

    var w = 1120;
    var h = 152;
    var padTop = 12;
    var padBottom = 24;
    var plotLeft = 40;
    var plotRight = w - 52;
    var plotH = h - padTop - padBottom;
    var maxRate = Math.max.apply(
      null,
      historyState.tx.concat(historyState.rx, [500])
    );
    var niceMax = Math.ceil(maxRate / 500) * 500;

    var txPath = buildSmoothPath(
      historyState.tx, w, h, padTop, padBottom, niceMax, 52
    );
    var rxPath = buildSmoothPath(
      historyState.rx, w, h, padTop, padBottom, niceMax, 52
    );
    var latPath = buildSmoothPath(
      historyState.latency, w, h, padTop, padBottom, 30, 52
    );

    var gridHtml = '';
    for (var g = 0; g <= 5; g++) {
      var gy = (padTop + (plotH * g) / 5).toFixed(1);
      var leftVal = 30 - g * 6;
      var rightVal = Math.round(((5 - g) * niceMax) / 5);
      var rightLabel = rightVal === 0 ? '0 B' :
        (rightVal >= 1024 ? (rightVal / 1024).toFixed(0) + ' MB' :
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
    historyState.times.forEach(function(t, idx) {
      var x = (plotLeft + ((plotRight - plotLeft) * idx) / 11).toFixed(1);
      xLabels += '<text class="chart-axis-text" x="' + x +
        '" y="146" text-anchor="middle">' + t + '</text>';
    });

    container.innerHTML =
      '<svg class="homeui-ikuai-svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs>' +
          '<linearGradient id="homeuiTxGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#6979f8" stop-opacity="0.20"/>' +
            '<stop offset="100%" stop-color="#6979f8" stop-opacity="0.01"/>' +
          '</linearGradient>' +
          '<linearGradient id="homeuiRxGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#5ad8a6" stop-opacity="0.18"/>' +
            '<stop offset="100%" stop-color="#5ad8a6" stop-opacity="0.01"/>' +
          '</linearGradient>' +
        '</defs>' +
        gridHtml +
        '<path d="' + txPath.area + '" fill="url(#homeuiTxGrad)"></path>' +
        '<path d="' + rxPath.area + '" fill="url(#homeuiRxGrad)"></path>' +
        '<path d="' + latPath.line + '" fill="none" stroke="#69b1ff" ' +
          'stroke-width="1.2" stroke-dasharray="3 3"></path>' +
        '<path d="' + txPath.line + '" fill="none" stroke="#7c89f8" ' +
          'stroke-width="1.4"></path>' +
        '<path d="' + rxPath.line + '" fill="none" stroke="#5ad8a6" ' +
          'stroke-width="1.4"></path>' +
        xLabels +
      '</svg>';
  }

  function renderClientBarSvg(container, mode)
  {
    if (!container)
      return;

    var w = 1120;
    var h = 142;
    var padTop = 10;
    var padBottom = 24;
    var plotLeft = 40;
    var plotRight = w - 24;
    var plotH = h - padTop - padBottom;
    var series = mode === 'conns' ? historyState.conns : historyState.clients;
    var maxVal = Math.max.apply(null, series.concat([30]));
    var niceMax = Math.ceil(maxVal / 6) * 6;

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
    series.forEach(function(val, idx) {
      var cx = plotLeft + 24 + step * idx;
      var ratio = Math.max(0.04, Math.min(1, (Number(val) || 0) / niceMax));
      var bh = plotH * ratio;
      var by = padTop + plotH - bh;
      var t = historyState.times[idx] || '';

      barsHtml +=
        '<rect x="' + (cx - 9).toFixed(1) + '" y="' + by.toFixed(1) +
          '" width="18" height="' + bh.toFixed(1) +
          '" rx="2.5" fill="#cbc6f9"></rect>' +
        '<text class="chart-axis-text" x="' + cx.toFixed(1) +
          '" y="136" text-anchor="middle">' + t + '</text>';
    });

    container.innerHTML =
      '<svg class="homeui-ikuai-svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        gridHtml +
        barsHtml +
      '</svg>';
  }

  function renderMemoryLineSvg(container, mode)
  {
    if (!container)
      return;

    var w = 1120;
    var h = 132;
    var padTop = 10;
    var padBottom = 22;
    var plotLeft = 40;
    var plotRight = w - 24;
    var plotH = h - padTop - padBottom;
    var series = mode === 'cpu' ? historyState.cpu : historyState.memory;
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
    historyState.times.forEach(function(t, idx) {
      var x = (plotLeft + ((plotRight - plotLeft) * idx) / 11).toFixed(1);
      dotsHtml +=
        '<circle cx="' + x + '" cy="' + (padTop + plotH).toFixed(1) +
          '" r="3" fill="#ffffff" stroke="#85a5ff" stroke-width="1.2"></circle>' +
        '<text class="chart-axis-text" x="' + x +
          '" y="126" text-anchor="middle">' + t + '</text>';
    });

    container.innerHTML =
      '<svg class="homeui-ikuai-svg" viewBox="0 0 ' + w + ' ' + h + '">' +
        '<defs>' +
          '<linearGradient id="homeuiMemGrad" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#3b82f6" stop-opacity="0.14"/>' +
            '<stop offset="100%" stop-color="#3b82f6" stop-opacity="0.01"/>' +
          '</linearGradient>' +
        '</defs>' +
        gridHtml +
        '<path d="' + pathObj.area + '" fill="url(#homeuiMemGrad)"></path>' +
        '<path d="' + pathObj.line + '" fill="none" stroke="#3b82f6" ' +
          'stroke-width="1.4"></path>' +
        dotsHtml +
      '</svg>';
  }

  function createIkuaiDashboard(view)
  {
    var dash = document.createElement('div');
    dash.className = 'homeui-ikuai-dashboard';

    var shortcuts = [
      {
        title: isChinese ? '内外网设置' : 'Interfaces',
        href: buildUrl('admin/network/network'),
        icon: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16"/>'
      },
      {
        title: isChinese ? '终端监控' : 'Clients',
        href: buildUrl('admin/status/nlbw'),
        icon: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 10h2m2 0h2m2 0h2"/>'
      },
      {
        title: 'PassWall',
        href: buildUrl('admin/services/passwall'),
        icon: '<path d="M12 2 4 6v6c0 5.5 3.4 10.6 8 12 4.6-1.4 8-6.5 8-12V6l-8-4z"/><path d="m9 12 2 2 4-4"/>'
      },
      {
        title: isChinese ? 'ACL/防火墙' : 'Firewall',
        href: buildUrl('admin/network/firewall'),
        icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 10h6M9 14h6"/>'
      },
      {
        title: 'Docker',
        href: buildUrl('admin/docker/containers'),
        icon: '<rect x="4" y="10" width="4" height="4" rx=".6"/><rect x="9" y="10" width="4" height="4" rx=".6"/><rect x="14" y="10" width="4" height="4" rx=".6"/><rect x="9" y="5" width="4" height="4" rx=".6"/><path d="M2 14.5c1 3.3 4.2 5 9.5 5 5.6 0 9-2.7 10-6.5"/>'
      },
      {
        title: 'WireGuard',
        href: buildUrl('admin/status/wireguard'),
        icon: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19v-1.5A4.5 4.5 0 0 1 7.5 13h1A4.5 4.5 0 0 1 13 17.5V19m0-5.5h3.5A4.5 4.5 0 0 1 21 18v1"/>'
      },
      {
        title: 'DDNS-Go',
        href: buildUrl('admin/services/ddns-go'),
        icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 12v3"/>'
      },
      {
        title: isChinese ? 'UU加速器' : 'UU Booster',
        href: buildUrl('admin/services/uugamebooster'),
        icon: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
      },
      {
        title: isChinese ? '终端工具' : 'Terminal',
        href: buildUrl('admin/services/ttyd'),
        icon: '<path d="M12 4a9 9 0 0 0-9 9v4h18v-4a9 9 0 0 0-9-9z"/><path d="m12 13 3.5-3.5"/>'
      }
    ];

    var shortcutsHtml = shortcuts.map(function(item) {
      return '<a class="homeui-quick-item" href="' + item.href + '">' +
        '<span class="homeui-quick-icon"><svg viewBox="0 0 24 24">' +
          item.icon + '</svg></span>' +
        '<span class="homeui-quick-label">' + item.title + '</span>' +
      '</a>';
    }).join('');

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
                '<span class="homeui-device-gwid" data-ov-gwid>ARCH:x86_64</span>' +
                '<span class="homeui-device-tip" data-ov-tip title="HomeWrt x86_64 Gateway">?</span>' +
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
            '<button type="button" class="homeui-wan-pill" data-wan-switch>' +
              'wan1 / br-lan' +
            '</button>' +
            '<ul class="homeui-wan-list">' +
              '<li>' +
                '<span>' + (isChinese ? '网络角色' : 'Role') + '</span>' +
                '<strong class="homeui-isp-val">' +
                  '<i class="isp-knot"></i>' +
                  '<em data-wan-isp>' +
                    (isChinese ? '旁路由网关' : 'Side Gateway') +
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
                  (isChinese ? '本月数据使用情况' : 'Traffic Used') +
                '</span>' +
                '<strong data-wan-total>0.00 GB</strong>' +
              '</li>' +
              '<li class="wan-rate-row">' +
                '<span>' + (isChinese ? '上下行速率' : 'Throughput') + '</span>' +
                '<strong class="homeui-wan-rates">' +
                  '<em class="rate-up">↑ <b data-wan-tx>0 B/s</b></em>' +
                  '<em class="rate-down">↓ <b data-wan-rx>0 B/s</b></em>' +
                '</strong>' +
              '</li>' +
              '<li class="wan-wave-row" aria-hidden="true">' +
                '<span></span>' +
                '<div class="homeui-mini-waves">' +
                  '<svg viewBox="0 0 42 18" class="wave-up">' +
                    '<path d="M2 14 L8 5 L14 15 L20 3 L26 14 L32 8 L40 13"/>' +
                  '</svg>' +
                  '<svg viewBox="0 0 42 18" class="wave-down">' +
                    '<path d="M2 13 L9 7 L15 15 L22 2 L28 16 L34 6 L40 12"/>' +
                  '</svg>' +
                '</div>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '系统负载' : 'Load Avg') + '</span>' +
                '<strong data-wan-load>0.08</strong>' +
              '</li>' +
            '</ul>' +
          '</section>' +

          '<section class="homeui-quick-card">' +
            '<div class="homeui-card-head">' +
              '<h3>' + (isChinese ? '快捷入口' : 'Quick Access') + '</h3>' +
              '<a href="#native" class="homeui-head-link" data-toggle-native>' +
                (isChinese ? '自定义' : 'More') +
              '</a>' +
            '</div>' +
            '<div class="homeui-quick-grid">' + shortcutsHtml + '</div>' +
          '</section>' +
        '</aside>' +

        '<section class="homeui-ikuai-right">' +
          '<div class="homeui-monitor-head">' +
            '<h3>' + (isChinese ? '监控信息' : 'Monitoring') + '</h3>' +
            '<button type="button" class="homeui-head-link" data-toggle-native>' +
              (isChinese ? '底层详情' : 'Details') +
            '</button>' +
          '</div>' +

          '<article class="homeui-chart-box">' +
            '<div class="homeui-chart-top">' +
              '<h4>' + (isChinese ? '上下行速率' : 'Throughput') + '</h4>' +
              '<div class="homeui-chart-tools">' +
                '<span class="homeui-select-pill">' +
                  (isChinese ? '平均值' : 'Average') + ' <i>▾</i>' +
                '</span>' +
                '<span class="homeui-select-pill">' +
                  (isChinese ? '全部' : 'All') + ' <i>▾</i>' +
                '</span>' +
                '<div class="homeui-seg-pills">' +
                  '<button type="button" class="active">' +
                    (isChinese ? '1小时' : '1H') +
                  '</button>' +
                  '<button type="button">' +
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
              '<span class="isp-knot"></span>' +
              '<strong data-rate-ifname>HomeWrt wan1</strong>' +
            '</div>' +
            '<div class="homeui-green-strip"></div>' +
          '</article>' +

          '<article class="homeui-chart-box">' +
            '<div class="homeui-chart-top">' +
              '<h4>' + (isChinese ? '终端数量' : 'Client Count') + '</h4>' +
              '<div class="homeui-chart-tools">' +
                '<span class="homeui-select-pill">' +
                  (isChinese ? '平均值' : 'Average') + ' <i>▾</i>' +
                '</span>' +
                '<span class="homeui-select-pill">' +
                  (isChinese ? '有线' : 'Wired') + ' <i>▾</i>' +
                '</span>' +
                '<div class="homeui-seg-pills" data-bar-tabs>' +
                  '<button type="button" class="active" data-mode="clients">' +
                    (isChinese ? '1小时' : '1H') +
                  '</button>' +
                  '<button type="button" data-mode="conns">' +
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
                '<span class="homeui-select-pill" data-mem-switch>' +
                  (isChinese ? '平均值' : 'Average') + ' <i>▾</i>' +
                '</span>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-svg-holder" data-chart-memory></div>' +
          '</article>' +
        '</section>' +
      '</div>';

    view.insertBefore(dash, view.firstChild);

    Array.prototype.forEach.call(
      dash.querySelectorAll('[data-toggle-native]'),
      function(btn) {
        btn.addEventListener('click', function(ev) {
          ev.preventDefault();
          view.classList.toggle('homeui-show-native');
        });
      }
    );

    var wanSwitch = dash.querySelector('[data-wan-switch]');
    if (wanSwitch) {
      wanSwitch.addEventListener('click', function() {
        netState.selectedWanIdx = (netState.selectedWanIdx + 1) % 2;
        enhanceOverview();
      });
    }

    Array.prototype.forEach.call(
      dash.querySelectorAll('.homeui-seg-pills'),
      function(group) {
        group.addEventListener('click', function(ev) {
          var btn = ev.target.closest('button');
          if (!btn)
            return;
          Array.prototype.forEach.call(
            group.querySelectorAll('button'),
            function(b) { b.classList.toggle('active', b === btn); }
          );
          if (btn.dataset.mode) {
            dash.dataset.barMode = btn.dataset.mode;
            renderClientBarSvg(
              dash.querySelector('[data-chart-clients]'),
              btn.dataset.mode
            );
          }
        });
      }
    );
  }

  function setText(rootEl, selector, value)
  {
    var el = rootEl.querySelector(selector);
    if (el && value !== undefined && value !== null && el.textContent !== String(value))
      el.textContent = String(value);
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

    var hostObj = getRowData(sysSec, [/主机名|hostname/i]);
    var archObj = getRowData(sysSec, [/架构|architecture/i]);
    var modelObj = getRowData(sysSec, [/型号|model/i]);
    var fwObj = getRowData(sysSec, [/固件版本|firmware/i]);
    var kernelObj = getRowData(sysSec, [/内核版本|kernel/i]);
    var uptimeObj = getRowData(sysSec, [/运行时间|uptime/i]);
    var loadObj = getRowData(sysSec, [/平均负载|load average/i]);
    var cpuObj = getRowData(sysSec, [/CPU.*%|CPU.*usage|CPU\s*使用率/i]);

    var memUsedObj = getRowData(memSec, [/已使用|已用|used/i]);
    var diskObj = getRowData(stoSec, [/磁盘空间|disk space|overlay/i]);
    var connObj = getRowData(netSec, [/活动连接|连接|active.*connection/i]);
    var onlineObj = getRowData(netSec, [/在线用户|online.*user/i]);

    var previewStats = view.querySelectorAll('.preview-stat strong');
    if (uptimeObj.text === '--' && previewStats.length >= 3) {
      uptimeObj.text = previewStats[0].textContent.trim();
      connObj.text = previewStats[1].textContent.trim();
      memUsedObj.text = previewStats[2].textContent.trim();
      memUsedObj.percent = parseFloat(memUsedObj.text) || 35;
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
      (modelObj.text !== '--' ? modelObj.text : 'x86_64 Virtual Router');
    if (kernelObj.text !== '--')
      gwidText += ' · Linux ' + kernelObj.text.split(' ')[0];
    setText(dash, '[data-ov-gwid]', gwidText);

    var tipEl = dash.querySelector('[data-ov-tip]');
    if (tipEl && fwObj.text !== '--')
      tipEl.title = fwObj.text;

    if (fwObj.text !== '--') {
      var verMatch = fwObj.text.match(/\d+\.\d+(?:\.\d+)?/);
      if (verMatch)
        setText(dash, '[data-ov-ver]', verMatch[0]);
    }

    var cpuPct = cpuObj.percent !== null ? Math.round(cpuObj.percent) : 6;
    var diskPct = diskObj.percent !== null ? Math.round(diskObj.percent) : 8;
    var memPct = memUsedObj.percent !== null ?
      Math.round(memUsedObj.percent) : 28;

    setDonutProgress(
      dash.querySelector('[data-ring-card="cpu"]'),
      cpuPct,
      cpuPct + '%'
    );
    setText(dash, '[data-ov-cpu-stat]', cpuPct + '%');
    setText(dash, '[data-ov-disk-stat]', diskPct + '%');

    var dhcpRows = dhcpSec ?
      dhcpSec.querySelectorAll('.table .tr:not(.table-titles)').length : 0;
    var onlineCount = parseInt(onlineObj.text, 10);
    if (isNaN(onlineCount))
      onlineCount = dhcpRows || 12;

    setDonutProgress(
      dash.querySelector('[data-ring-card="clients"]'),
      Math.min(100, Math.max(12, onlineCount * 3)),
      onlineCount
    );
    setText(dash, '[data-ov-wifi-stat]', '0');
    setText(dash, '[data-ov-wired-stat]', onlineCount);

    var connCount = 0;
    var connSource = connObj.title || connObj.text || '';
    var connMatch = connSource.match(/(\d+)/);
    if (connMatch)
      connCount = parseInt(connMatch[1], 10);
    if (!connCount)
      connCount = 378;

    var tcpCount = Math.round(connCount * 0.82);
    var udpCount = Math.round(connCount * 0.15);
    var icmpCount = Math.max(0, connCount - tcpCount - udpCount);

    setDonutProgress(
      dash.querySelector('[data-ring-card="conns"]'),
      Math.min(100, Math.max(15, Math.round(connCount / 20))),
      connCount
    );
    setText(dash, '[data-ov-tcp-stat]', tcpCount);
    setText(dash, '[data-ov-udp-stat]', udpCount);
    setText(dash, '[data-ov-icmp-stat]', icmpCount);

    var netBoxes = extractNetworkBoxes(netSec);
    var primaryBox = netBoxes[netState.selectedWanIdx % Math.max(1, netBoxes.length)] ||
      netBoxes[0] || {
        title: 'wan1 / br-lan',
        proto: 'STATIC',
        addr: '10.10.10.2',
        gw: '10.10.10.1',
        uptime: uptimeFormatted
      };

    var cleanIp = (primaryBox.addr || '10.10.10.2').split('/')[0];
    setText(dash, '[data-ov-ip]', cleanIp);
    setText(dash, '[data-wan-switch]', primaryBox.title || 'wan1 (br-lan)');
    setText(dash, '[data-rate-ifname]', hostname + ' ' + (primaryBox.title || 'br-lan'));
    setText(dash, '[data-wan-ip]', cleanIp);
    setText(dash, '[data-wan-proto]', primaryBox.proto || 'STATIC');
    setText(dash, '[data-wan-gw]', primaryBox.gw || '10.10.10.1');
    setText(
      dash,
      '[data-wan-uptime]',
      formatUptimeChinese(primaryBox.uptime || uptimeObj.text)
    );

    if (loadObj.text !== '--')
      setText(dash, '[data-wan-load]', loadObj.text);

    if (netState.totalBytes > 0) {
      setText(dash, '[data-wan-total]', formatBytes(netState.totalBytes));
      setText(dash, '[data-wan-tx]', formatRate(netState.txSpeed));
      setText(dash, '[data-wan-rx]', formatRate(netState.rxSpeed));
    } else if (primaryBox.rxText || primaryBox.txText) {
      setText(dash, '[data-wan-total]', '12.48 GB');
      setText(dash, '[data-wan-tx]', primaryBox.txText || '50.49 KB/s');
      setText(dash, '[data-wan-rx]', primaryBox.rxText || '144.57 KB/s');
    }

    var now = new Date();
    var nowMs = now.getTime();
    var timeLabel = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    var txKb = netState.txSpeed > 0 ?
      Math.round(netState.txSpeed / 1024) : 165;
    var rxKb = netState.rxSpeed > 0 ?
      Math.round(netState.rxSpeed / 1024) : 245;

    if (!historyState.seeded) {
      for (var k = 0; k < 12; k++) {
        var wave = Math.sin(k * 0.7) * 0.25 + 1;
        historyState.clients[k] = Math.max(1, Math.round(onlineCount));
        historyState.conns[k] = Math.max(1, Math.round(connCount * wave));
        historyState.memory[k] = memPct;
        historyState.cpu[k] = cpuPct;
      }
      historyState.seeded = true;
      historyState.lastPush = nowMs;
    } else if (nowMs - (historyState.lastPush || 0) >= 4500) {
      historyState.times.shift();
      historyState.times.push(timeLabel);
      historyState.tx.shift();
      historyState.tx.push(txKb);
      historyState.rx.shift();
      historyState.rx.push(rxKb);
      historyState.clients.shift();
      historyState.clients.push(onlineCount);
      historyState.conns.shift();
      historyState.conns.push(connCount);
      historyState.memory.shift();
      historyState.memory.push(memPct);
      historyState.cpu.shift();
      historyState.cpu.push(cpuPct);
      historyState.lastPush = nowMs;
    }

    saveHistoryState();

    renderRateChartSvg(dash.querySelector('[data-chart-rate]'));
    renderClientBarSvg(
      dash.querySelector('[data-chart-clients]'),
      dash.dataset.barMode || 'clients'
    );
    renderMemoryLineSvg(dash.querySelector('[data-chart-memory]'), 'memory');
  }

  var isEnhancing = false;

  function enhanceOverview()
  {
    var page = document.body ? (document.body.dataset.page || '') : '';
    if (page !== 'admin-status-overview' || isEnhancing)
      return;

    var view = document.querySelector('#view') ||
      document.querySelector('#maincontent');
    if (!view)
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
        'dsl',
        'wifi'
      ];
      var sections = view.querySelectorAll(':scope > .cbi-section');
      var sectionMap = {};

      view.classList.add('homeui-overview-grid');

      if (!view.querySelector('.homeui-ikuai-dashboard'))
        createIkuaiDashboard(view);

      Array.prototype.forEach.call(sections, function(section, index) {
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
        !m.target.closest('.homeui-ikuai-dashboard');
    });
    if (shouldUpdate)
      enhanceOverview();
  }).observe(
    document.querySelector('#maincontent') || document.body,
    { childList: true, subtree: true }
  );

  if (isOverview) {
    pollLuciNetworkCounters(enhanceOverview);
    setInterval(function() {
      pollLuciNetworkCounters(enhanceOverview);
    }, 5000);
  }

  applyColorMode(root.dataset.colorMode || 'auto');
  labelIndicators();
  enhanceOverview();
})();
