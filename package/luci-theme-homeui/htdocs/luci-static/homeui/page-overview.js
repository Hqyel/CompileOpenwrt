(function(window) {
  'use strict';

  var HomeUI = window.HomeUI;
  var isChinese = HomeUI.isChinese;
  var chartState = HomeUI.chartState;
  var liveState = HomeUI.liveState;
  var SHORTCUT_CATALOG = HomeUI.SHORTCUT_CATALOG;
  var DEFAULT_SHORTCUT_IDS = HomeUI.DEFAULT_SHORTCUT_IDS;
  var pad2 = HomeUI.pad2;
  var buildUrl = HomeUI.buildUrl;
  var formatBytes = HomeUI.formatBytes;
  var formatRate = HomeUI.formatRate;
  var formatRateKB = HomeUI.formatRateKB;
  var formatUptimeChinese = HomeUI.formatUptimeChinese;
  var formatUnixLocalTime = HomeUI.formatUnixLocalTime;
  var escapeHtml = HomeUI.escapeHtml;
  var setText = HomeUI.setText;

  var REALTIME_WINDOW_MS = 6 * 60 * 1000;
  var REALTIME_BUCKET_COUNT = 12;
  var MINI_SAMPLE_COUNT = 20;
  var MAX_REALTIME_SAMPLES = 160;

  function getRealtimeAxisLabels(now)
  {
    var labels = [];
    var bucketMs = REALTIME_WINDOW_MS / REALTIME_BUCKET_COUNT;
    var start = now - REALTIME_WINDOW_MS;

    for (var i = 0; i < REALTIME_BUCKET_COUNT; i++) {
      var d = new Date(start + (i + 0.5) * bucketMs);
      labels.push(pad2(d.getHours()) + ':' + pad2(d.getMinutes()));
    }

    return labels;
  }

  function appendLimitedSample(list, sample, limit)
  {
    if (!Array.isArray(list))
      return;

    var last = list.length ? list[list.length - 1] : null;
    if (last && last.time === sample.time)
      list[list.length - 1] = sample;
    else
      list.push(sample);

    while (list.length > limit)
      list.shift();
  }

  function aggregateSamples(samples, keys, stat, now)
  {
    var bucketMs = REALTIME_WINDOW_MS / REALTIME_BUCKET_COUNT;
    var start = now - REALTIME_WINDOW_MS;
    var buckets = [];

    for (var i = 0; i < REALTIME_BUCKET_COUNT; i++) {
      var values = {};
      keys.forEach(function(key) {
        values[key] = [];
      });
      buckets.push(values);
    }

    (samples || []).forEach(function(sample) {
      var idx = Math.floor((sample.time - start) / bucketMs);
      if (idx === REALTIME_BUCKET_COUNT)
        idx = REALTIME_BUCKET_COUNT - 1;
      if (idx < 0 || idx >= REALTIME_BUCKET_COUNT)
        return;

      keys.forEach(function(key) {
        var value = Number(sample[key]);
        if (isFinite(value))
          buckets[idx][key].push(value);
      });
    });

    var result = {};
    keys.forEach(function(key) {
      result[key] = buckets.map(function(bucket) {
        var values = bucket[key];
        if (!values.length)
          return null;
        if (stat === 'peak')
          return Math.max.apply(null, values);
        return values.reduce(function(sum, value) {
          return sum + value;
        }, 0) / values.length;
      });
    });

    result.times = getRealtimeAxisLabels(now);
    return result;
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
            gw: '--',
            dns: '--',
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

  function normalizeRealtimeTimestamp(timestamp)
  {
    var value = Number(timestamp) || 0;
    return value > 1000000000000 ? value : value * 1000;
  }

  function updateRealtimeInterface(deviceName, rows)
  {
    if (!deviceName || !Array.isArray(rows) || !rows.length)
      return;

    var validRows = rows.filter(function(row) {
      return Array.isArray(row) && row.length >= 4 &&
        isFinite(Number(row[0]));
    });
    if (!validRows.length)
      return;

    var state = liveState.interfaceStats[deviceName];
    if (!state) {
      state = {
        timestamp: 0,
        rxBytes: 0,
        txBytes: 0,
        rxBps: 0,
        txBps: 0,
        rateReady: false,
        clockOffsetMs: 0,
        samples: []
      };
      liveState.interfaceStats[deviceName] = state;
    }

    var newestTimestamp = Number(validRows[validRows.length - 1][0]) || 0;
    if (state.timestamp && newestTimestamp < state.timestamp) {
      state.timestamp = 0;
      state.rxBps = 0;
      state.txBps = 0;
      state.rateReady = false;
      state.samples = [];
    }

    if (!state.timestamp) {
      var baseline = validRows[validRows.length - 1];
      state.timestamp = Number(baseline[0]) || 0;
      state.rxBytes = Number(baseline[1]) || 0;
      state.txBytes = Number(baseline[3]) || 0;
      state.clockOffsetMs = Date.now() -
        normalizeRealtimeTimestamp(state.timestamp);
      return;
    }

    validRows.forEach(function(row) {
      var timestamp = Number(row[0]) || 0;
      var rxBytes = Number(row[1]) || 0;
      var txBytes = Number(row[3]) || 0;
      if (timestamp <= state.timestamp)
        return;

      var elapsed = timestamp - state.timestamp;
      if (timestamp > 1000000000000 || state.timestamp > 1000000000000)
        elapsed /= 1000;

      if (elapsed > 0 && rxBytes >= state.rxBytes &&
          txBytes >= state.txBytes) {
        state.rxBps = Math.max(0, (rxBytes - state.rxBytes) / elapsed);
        state.txBps = Math.max(0, (txBytes - state.txBytes) / elapsed);
        appendLimitedSample(state.samples, {
          time: normalizeRealtimeTimestamp(timestamp) + state.clockOffsetMs,
          rxKB: state.rxBps / 1024,
          txKB: state.txBps / 1024
        }, MAX_REALTIME_SAMPLES);
      } else {
        state.rxBps = 0;
        state.txBps = 0;
      }

      state.timestamp = timestamp;
      state.rxBytes = rxBytes;
      state.txBytes = txBytes;
      state.rateReady = true;
    });
  }

  function pollLiveThroughput(callback)
  {
    if (!window.L || typeof window.L.require !== 'function' ||
        liveState.throughputPollBusy)
      return Promise.resolve();

    var deviceNames = [];
    var seen = {};
    liveState.ifaces.forEach(function(iface) {
      var name = iface.devName || iface.name;
      if (name && !seen[name]) {
        seen[name] = true;
        deviceNames.push(name);
      }
    });
    if (!deviceNames.length)
      return Promise.resolve();

    liveState.throughputPollBusy = true;

    return window.L.require('rpc').then(function(rpc) {
      var callRealtimeStats = rpc.declare({
        object: 'luci',
        method: 'getRealtimeStats',
        params: ['mode', 'device'],
        expect: { result: [] }
      });

      return Promise.all(deviceNames.map(function(deviceName) {
        return callRealtimeStats('interface', deviceName).then(function(rows) {
          updateRealtimeInterface(deviceName, rows);
        }).catch(function() {});
      }));
    }).then(function() {
      liveState.ifaces.forEach(function(iface) {
        var state = liveState.interfaceStats[iface.devName];
        if (!state)
          return;
        iface.rxBytes = state.rxBytes;
        iface.txBytes = state.txBytes;
        iface.rxSpeed = state.rxBps;
        iface.txSpeed = state.txBps;
        iface.rateReady = state.rateReady;
      });

      if (typeof callback === 'function')
        callback();
    }).catch(function() {}).then(function() {
      liveState.throughputPollBusy = false;
    });
  }

  function updateSystemInfoStats(info)
  {
    if (!info || typeof info !== 'object')
      return false;

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
      liveState.memorySamplePending = true;
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

    liveState.rpcStorageRows = stRows;
    return true;
  }

  function pollLiveMemory(callback)
  {
    if (!window.L || typeof window.L.require !== 'function' ||
        liveState.memoryPollBusy)
      return Promise.resolve();

    liveState.memoryPollBusy = true;
    return window.L.require('rpc').then(function(rpc) {
      var callSysInfo = rpc.declare({
        object: 'system',
        method: 'info'
      });
      return callSysInfo();
    }).then(function(info) {
      if (updateSystemInfoStats(info) && typeof callback === 'function')
        callback();
    }).catch(function() {}).then(function() {
      liveState.memoryPollBusy = false;
    });
  }

  function pollLiveRouterStats(callback)
  {
    if (!window.L || typeof window.L.require !== 'function')
      return Promise.resolve();
    if (liveState.statsPollBusy)
      return Promise.resolve();

    liveState.statsPollBusy = true;

    return Promise.all([
      window.L.require('network').catch(function() { return null; }),
      window.L.require('rpc').catch(function() { return null; })
    ]).then(function(mods) {
      var network = mods[0];
      var rpc = mods[1];
      var tasks = [];

      if (network) {
        tasks.push(
          Promise.resolve(
            network.flushCache ? network.flushCache() : null
          ).then(function() {
            return Promise.all([
              network.getWANNetworks ? network.getWANNetworks() : [],
              network.getWAN6Networks ? network.getWAN6Networks() : [],
              network.getNetworks ? network.getNetworks() : [],
              network.getWifiNetworks ? network.getWifiNetworks() : []
            ]);
          }).then(function(netRes) {
            var wanNets = (netRes[0] || []).concat(netRes[1] || []);
            var allNets = netRes[2] || [];
            var wifis = netRes[3] || [];
            var seenNets = {};

            if (!wanNets.length) {
              wanNets = allNets.filter(function(n) {
                var name = (n.getName && n.getName()) || '';
                return /^wan/i.test(name);
              });
            }
            if (!wanNets.length) {
              wanNets = allNets.filter(function(n) {
                var name = (n.getName && n.getName()) || '';
                return name && name !== 'loopback' &&
                  (!n.isUp || n.isUp() !== false);
              });
            }

            var ifaceMap = {};
            wanNets.forEach(function(n) {
              var name = (n.getName && n.getName()) || '';
              if (!name || seenNets[name])
                return;
              seenNets[name] = true;
              var l3 = (n.getL3Device && n.getL3Device()) ||
                (n.getDevice && n.getDevice());
              var dname = (l3 && l3.getName && l3.getName()) || name;
              var ip = (n.getIPAddr && n.getIPAddr()) ||
                (n.getIP6Addr && n.getIP6Addr()) || '';
              var gw = (n.getGatewayAddr && n.getGatewayAddr()) ||
                (n.getGateway6Addr && n.getGateway6Addr()) || '';
              var dnsArr = (n.getDNSAddrs && n.getDNSAddrs()) || [];
              var proto = (n.getProtocol && n.getProtocol()) || 'static';
              var up = (n.isUp && n.isUp()) !== false;
              var uptime = (n.getUptime && n.getUptime()) || 0;

              if (!ifaceMap[dname]) {
                ifaceMap[dname] = {
                  name: dname,
                  devName: dname,
                  networkNames: [],
                  active: false,
                  proto: '',
                  addr: '',
                  gw: '--',
                  dns: '--',
                  uptime: 0,
                  rxBytes: 0,
                  txBytes: 0,
                  rxSpeed: 0,
                  txSpeed: 0,
                  rateReady: false
                };
              }

              var iface = ifaceMap[dname];
              iface.networkNames.push(name);
              iface.active = iface.active || up;
              iface.proto = iface.proto || String(proto).toUpperCase();
              iface.addr = iface.addr || ip;
              iface.gw = iface.gw === '--' ? (gw || '--') : iface.gw;
              iface.dns = iface.dns === '--' ?
                (dnsArr.slice(0, 2).join(', ') || '--') : iface.dns;
              iface.uptime = Math.max(iface.uptime, uptime);
            });

            var parsedIfaces = Object.keys(ifaceMap).map(function(key) {
              var iface = ifaceMap[key];
              var names = iface.networkNames.join(' / ');
              iface.title = names +
                (iface.devName !== names ? ' (' + iface.devName + ')' : '');
              var state = liveState.interfaceStats[iface.devName];
              if (state) {
                iface.rxBytes = state.rxBytes;
                iface.txBytes = state.txBytes;
                iface.rxSpeed = state.rxBps;
                iface.txSpeed = state.txBps;
                iface.rateReady = state.rateReady;
              }
              return iface;
            });

            if (parsedIfaces.length) {
              parsedIfaces.sort(function(a, b) {
                return a.title.localeCompare(b.title);
              });
              liveState.ifaces = parsedIfaces;
              if (!parsedIfaces.some(function(iface) {
                return iface.devName === liveState.selectedWanKey;
              }))
                liveState.selectedWanKey = parsedIfaces[0].devName;
            } else {
              liveState.ifaces = [];
              liveState.selectedWanKey = '';
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
            liveState.clientSamplePending = true;
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
        var callDhcpLeases = rpc.declare({
          object: 'luci-rpc',
          method: 'getDHCPLeases'
        });
        var callHostHints = rpc.declare({
          object: 'luci-rpc',
          method: 'getHostHints'
        });

        tasks.push(
          callConns('conntrack', '').then(function(rows) {
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

        if (!liveState.boardInfo) {
          tasks.push(
            callBoard().then(function(board) {
              if (board && typeof board === 'object')
                liveState.boardInfo = board;
            }).catch(function() {})
          );
        }

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

            liveState.rpcLeases = list;
            liveState.clientSamplePending = true;
          }).catch(function() {})
        );
      }

      return Promise.all(tasks);
    }).then(function() {
      if (typeof callback === 'function')
        callback();
    }).catch(function() {}).then(function() {
      liveState.statsPollBusy = false;
    });
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

    var pct = Math.max(0, Math.min(100, Number(percent) || 0));
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
      if (val === null || val === undefined || !isFinite(Number(val)))
        return null;
      var ratio = Math.max(0, Math.min(1, Number(val) / safeMax));
      var y = padTop + plotH * (1 - ratio);
      return [x, y];
    });
    var segments = [];
    var segment = [];
    coords.forEach(function(coord) {
      if (coord)
        segment.push(coord);
      else if (segment.length) {
        segments.push(segment);
        segment = [];
      }
    });
    if (segment.length)
      segments.push(segment);

    var lines = [];
    var areas = [];
    var baseLineY = (padTop + plotH).toFixed(1);
    segments.forEach(function(pointsInSegment) {
      var first = pointsInSegment[0];
      var d = 'M ' + first[0].toFixed(1) + ' ' + first[1].toFixed(1);

      for (var i = 0; i < pointsInSegment.length - 1; i++) {
        var p0 = pointsInSegment[i];
        var p1 = pointsInSegment[i + 1];
        var cx = ((p0[0] + p1[0]) / 2).toFixed(1);
        d += ' C ' + cx + ' ' + p0[1].toFixed(1) + ', ' +
          cx + ' ' + p1[1].toFixed(1) + ', ' +
          p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
      }

      lines.push(d);
      if (pointsInSegment.length > 1) {
        var last = pointsInSegment[pointsInSegment.length - 1];
        areas.push(d + ' L ' + last[0].toFixed(1) + ' ' + baseLineY +
          ' L ' + first[0].toFixed(1) + ' ' + baseLineY + ' Z');
      }
    });

    return {
      line: lines.join(' '),
      area: areas.join(' '),
      coords: coords
    };
  }

  function getRateSeriesForSelection()
  {
    var state = liveState.interfaceStats[liveState.selectedWanKey];
    return aggregateSamples(
      state ? state.samples : [],
      ['txKB', 'rxKB'],
      chartState.rateStat,
      Date.now()
    );
  }

  function renderRateChartSvg(dash)
  {
    if (!dash)
      return;
    var container = dash.querySelector('[data-chart-rate]');
    if (!container)
      return;

    var data = getRateSeriesForSelection();
    var state = liveState.interfaceStats[liveState.selectedWanKey];
    var values = data.txKB.concat(data.rxKB).filter(function(value) {
      return value !== null && isFinite(Number(value));
    });
    if (!values.length) {
      container.innerHTML = '<div class="homeui-empty-hint">' +
        (isChinese ? '正在采集实时速率…' :
          'Collecting real-time throughput…') + '</div>';
      setText(
        dash,
        '[data-leg-tx]',
        state && state.rateReady ? formatRate(state.txBps) : '--'
      );
      setText(
        dash,
        '[data-leg-rx]',
        state && state.rateReady ? formatRate(state.rxBps) : '--'
      );
      return;
    }

    var w = 1120;
    var h = 152;
    var padTop = 14;
    var padBottom = 24;
    var plotLeft = 40;
    var plotRight = w - 58;
    var plotH = h - padTop - padBottom;
    var maxRate = Math.max.apply(null, values.concat([100]));
    var stepUnit = maxRate > 2000 ? 500 : (maxRate > 500 ? 200 : 50);
    var niceMax = Math.max(100, Math.ceil(maxRate / stepUnit) * stepUnit);

    var txPath = buildSmoothPath(
      data.txKB, w, h, padTop, padBottom, niceMax, 58
    );
    var rxPath = buildSmoothPath(
      data.rxKB, w, h, padTop, padBottom, niceMax, 58
    );

    var gridHtml = '';
    for (var g = 0; g <= 5; g++) {
      var gy = (padTop + (plotH * g) / 5).toFixed(1);
      var rightVal = Math.round(((5 - g) * niceMax) / 5);
      var rightLabel = rightVal === 0 ? '0 B' :
        (rightVal >= 1024 ? (rightVal / 1024).toFixed(1) + ' MB' :
          rightVal + ' KB');

      gridHtml +=
        '<line class="chart-grid-line" x1="' + plotLeft + '" y1="' + gy +
          '" x2="' + plotRight + '" y2="' + gy + '"></line>' +
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
        var tip = t + ' | ↑ ' + formatRateKB(data.txKB[idx]) +
          ' / ↓ ' + formatRateKB(data.rxKB[idx]);
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
        '<path d="' + txPath.line + '" fill="none" stroke="#7c89f8" ' +
          'stroke-width="1.5"></path>' +
        '<path d="' + rxPath.line + '" fill="none" stroke="#5ad8a6" ' +
          'stroke-width="1.5"></path>' +
        pointsHtml +
        xLabels +
      '</svg>';

    setText(dash, '[data-leg-tx]', formatRate(state ? state.txBps : 0));
    setText(dash, '[data-leg-rx]', formatRate(state ? state.rxBps : 0));
  }

  function renderClientBarSvg(dash)
  {
    if (!dash)
      return;
    var container = dash.querySelector('[data-chart-clients]');
    if (!container)
      return;

    var cType = chartState.clientType || 'wired';
    var data = aggregateSamples(
      liveState.clientSamples,
      ['wired', 'wireless'],
      chartState.clientStat,
      Date.now()
    );
    var series;

    if (cType === 'wireless') {
      series = data.wireless;
    } else if (cType === 'all') {
      series = data.wired.map(function(wired, idx) {
        var wireless = data.wireless[idx];
        if (wired === null && wireless === null)
          return null;
        return (Number(wired) || 0) + (Number(wireless) || 0);
      });
    } else {
      series = data.wired;
    }

    var values = series.filter(function(value) {
      return value !== null && isFinite(Number(value));
    });
    if (!values.length) {
      container.innerHTML = '<div class="homeui-empty-hint">' +
        (isChinese ? '正在采集终端数量…' :
          'Collecting client counts…') + '</div>';
      return;
    }

    var times = data.times;
    var w = 1120;
    var h = 146;
    var padTop = 16;
    var padBottom = 24;
    var plotLeft = 40;
    var plotRight = w - 24;
    var plotH = h - padTop - padBottom;
    var maxVal = Math.max.apply(null, values.concat([10]));
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
      if (val === null)
        return;
      var numVal = Math.max(0, Math.round(Number(val) || 0));
      var cx = plotLeft + 24 + step * idx;
      var ratio = Math.max(0, Math.min(1, numVal / niceMax));
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

    var data = aggregateSamples(
      liveState.memorySamples,
      ['percent'],
      chartState.memStat,
      Date.now()
    );
    var series = data.percent;
    var values = series.filter(function(value) {
      return value !== null && isFinite(Number(value));
    });
    if (!values.length) {
      container.innerHTML = '<div class="homeui-empty-hint">' +
        (isChinese ? '正在采集内存使用率…' :
          'Collecting memory usage…') + '</div>';
      return;
    }
    var times = data.times;

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
      var coord = pathObj.coords[idx];
      if (!coord)
        return;
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

  function updateWanSelector(dash, ifaces)
  {
    var select = dash.querySelector('[data-wan-switch]');
    if (!select)
      return;

    var selected = liveState.selectedWanKey;
    select.innerHTML = '';
    (ifaces || []).forEach(function(iface) {
      var option = document.createElement('option');
      option.value = iface.devName;
      option.textContent = iface.title;
      option.selected = iface.devName === selected;
      select.appendChild(option);
    });

    if (!select.options.length) {
      var emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = isChinese ? '暂无 WAN 接口' :
        'No WAN interface';
      select.appendChild(emptyOption);
    }
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
          '<td><span class="homeui-tag is-blue">' + (it.proto || '--') + '</span></td>' +
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
          var pct = Math.max(0, Math.min(100, Number(r.percent) || 0));
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
                '<strong class="homeui-device-title" data-ov-hostname>--</strong>' +
                '<span class="homeui-device-gwid" data-ov-gwid>--</span>' +
                '<span class="homeui-device-tip" data-ov-tip>?</span>' +
              '</div>' +
              '<div class="homeui-device-line2">' +
                '<span class="homeui-device-ver" data-ov-ver>--</span>' +
                '<em class="homeui-device-edition">' +
                  (isChinese ? '免费版' : 'Custom') +
                '</em>' +
                '<span class="homeui-device-ip">IP:<b data-ov-ip>--</b></span>' +
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
              '<span class="homeui-donut-val">--</span>' +
            '</div>' +
            '<div class="homeui-ring-stats">' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-cpu-stat>--</strong>' +
                '<small>' + (isChinese ? 'CPU占用' : 'CPU') + '</small>' +
              '</div>' +
              '<div class="ring-stat-col">' +
                '<strong data-ov-disk-stat>--</strong>' +
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
            '<select class="homeui-wan-pill" data-wan-switch ' +
              'title="' + (isChinese ? '选择 WAN 接口' :
                'Select WAN interface') + '">' +
              '<option value="">' +
                (isChinese ? '正在读取 WAN 接口…' :
                  'Loading WAN interfaces…') +
              '</option>' +
            '</select>' +
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
                '<strong data-wan-ip>--</strong>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '接入方式' : 'Protocol') + '</span>' +
                '<strong data-wan-proto>--</strong>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '上级网关' : 'Gateway') + '</span>' +
                '<strong data-wan-gw>--</strong>' +
              '</li>' +
              '<li>' +
                '<span>' + (isChinese ? '运行时间' : 'Uptime') + '</span>' +
                '<strong data-wan-uptime>--</strong>' +
              '</li>' +
              '<li>' +
                '<span>' +
                  (isChinese ? '累计使用流量' : 'Traffic Used') +
                '</span>' +
                '<strong data-wan-total>--</strong>' +
              '</li>' +
              '<li class="wan-rate-row">' +
                '<span>' + (isChinese ? '上下行速率' : 'Throughput') + '</span>' +
                '<strong class="homeui-wan-rates">' +
                  '<em class="rate-up">↑ <b data-wan-tx>--</b></em>' +
                  '<em class="rate-down">↓ <b data-wan-rx>--</b></em>' +
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
                '<strong data-wan-load>--</strong>' +
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
                  '<div class="homeui-res-fill" data-res-mem-bar style="width:0"></div>' +
                '</div>' +
              '</div>' +
              '<div class="homeui-res-item">' +
                '<div class="homeui-res-row">' +
                  '<span>' + (isChinese ? '磁盘空间' : 'Disk Space') + '</span>' +
                  '<strong data-res-disk-text>--</strong>' +
                '</div>' +
                '<div class="homeui-res-track">' +
                  '<div class="homeui-res-fill is-green" data-res-disk-bar style="width:0"></div>' +
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
                '<span class="homeui-live-label">' +
                  (isChinese ? '实时 · 3 秒更新' :
                    'Live · 3 second updates') +
                '</span>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-chart-subaxis">' +
              '<span></span>' +
              '<span>' + (isChinese ? '速率' : 'Speed') + '</span>' +
            '</div>' +
            '<div class="homeui-svg-holder" data-chart-rate></div>' +
            '<div class="homeui-rate-legend">' +
              '<div class="homeui-rate-legend-left">' +
                '<span class="isp-knot"></span>' +
                '<strong data-rate-ifname>--</strong>' +
              '</div>' +
              '<div class="homeui-rate-legend-metrics">' +
                '<em class="leg-tx">↑ ' + (isChinese ? '上行: ' : 'TX: ') +
                  '<b data-leg-tx>--</b></em>' +
                '<em class="leg-rx">↓ ' + (isChinese ? '下行: ' : 'RX: ') +
                  '<b data-leg-rx>--</b></em>' +
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
                '<span class="homeui-live-label">' +
                  (isChinese ? '实时 · 15 秒更新' :
                    'Live · 15 second updates') +
                '</span>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-svg-holder" data-chart-clients></div>' +
          '</article>' +

          '<article class="homeui-chart-box">' +
            '<div class="homeui-chart-top">' +
              '<h4>' + (isChinese ? '内存使用率' : 'Memory Usage') + '</h4>' +
              '<div class="homeui-chart-tools">' +
                createDropdownHtml('mem-stat', avgLabel, statOpts) +
                '<span class="homeui-live-label">' +
                  (isChinese ? '实时 · 5 秒更新' :
                    'Live · 5 second updates') +
                '</span>' +
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
      wanSwitch.addEventListener('change', function() {
        liveState.selectedWanKey = wanSwitch.value;
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

    var deviceName = primaryBox && primaryBox.devName;
    var state = deviceName ? liveState.interfaceStats[deviceName] : null;
    var samples = state ? state.samples.slice(-MINI_SAMPLE_COUNT) : [];
    if (!samples.length) {
      if (txSvg)
        txSvg.innerHTML = '';
      if (rxSvg)
        rxSvg.innerHTML = '';
      return;
    }

    var txArr = samples.map(function(sample) {
      return Math.max(0, Number(sample.txKB) || 0);
    });
    var rxArr = samples.map(function(sample) {
      return Math.max(0, Number(sample.rxKB) || 0);
    });

    function buildWaveSvgContent(series, gradId, color)
    {
      var w = 210;
      var h = 20;
      var padTop = 3;
      var padBottom = 2;
      var plotLeft = 2;
      var plotRight = w - 3;
      var plotW = plotRight - plotLeft;
      var plotH = h - padTop - padBottom;
      var maxV = Math.max.apply(null, series.concat([1]));

      var coords = series.map(function(rawVal, idx) {
        var val = Math.max(0, Number(rawVal) || 0);
        var x = plotLeft + (plotW * idx) / (MINI_SAMPLE_COUNT - 1);
        var norm = Math.max(0, Math.min(1, val / maxV));
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
      txSvg.innerHTML = buildWaveSvgContent(
        txArr, 'homeuiWanUpGrad', '#6d78f6');
    if (rxSvg)
      rxSvg.innerHTML = buildWaveSvgContent(
        rxArr, 'homeuiWanDownGrad', '#4cd4a0');
  }

  function recordOverviewSamples(wired, wireless, memPct)
  {
    var now = Date.now();
    var lastClient = liveState.clientSamples.length ?
      liveState.clientSamples[liveState.clientSamples.length - 1] : null;
    if (liveState.clientSamplePending &&
        (!lastClient || now - lastClient.time >= 10000)) {
      appendLimitedSample(liveState.clientSamples, {
        time: now,
        wired: Math.max(0, Number(wired) || 0),
        wireless: Math.max(0, Number(wireless) || 0)
      }, MAX_REALTIME_SAMPLES);
    }
    liveState.clientSamplePending = false;

    var lastMemory = liveState.memorySamples.length ?
      liveState.memorySamples[liveState.memorySamples.length - 1] : null;
    if (liveState.memorySamplePending &&
        memPct !== null && memPct !== undefined &&
        (!lastMemory || now - lastMemory.time >= 4500) &&
        isFinite(Number(memPct))) {
      appendLimitedSample(liveState.memorySamples, {
        time: now,
        percent: Math.max(0, Math.min(100, Number(memPct)))
      }, MAX_REALTIME_SAMPLES);
    }
    liveState.memorySamplePending = false;
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
      var previewMemPct = parseFloat(memUsedObj.text);
      memUsedObj.percent = isNaN(previewMemPct) ? null : previewMemPct;
    }

    var hostname = hostObj.text !== '--' ? hostObj.text : '--';
    var uptimeFormatted = formatUptimeChinese(uptimeObj.text);
    setText(
      dash,
      '[data-ov-uptime]',
      (isChinese ? '系统运行时间: ' : 'Uptime: ') + uptimeFormatted
    );
    setText(dash, '[data-ov-hostname]', hostname);

    var gwidText = archObj.text !== '--' ? archObj.text :
      (modelObj.text !== '--' ? modelObj.text : '--');
    setText(dash, '[data-ov-gwid]', gwidText);

    var tipEl = dash.querySelector('[data-ov-tip]');
    if (tipEl && fwObj.text !== '--')
      tipEl.title = fwObj.text;

    if (fwObj.text !== '--') {
      var verMatch = fwObj.text.match(/\d+\.\d+(?:\.\d+)?/);
      if (verMatch)
        setText(dash, '[data-ov-ver]', verMatch[0]);
    }

    var cpuPct = cpuObj.percent !== null ? Math.round(cpuObj.percent) : null;
    var diskPct = diskObj.percent !== null ? Math.round(diskObj.percent) :
      (liveState.diskPct !== null ? liveState.diskPct : null);
    var memPct = memUsedObj.percent !== null ?
      Math.round(memUsedObj.percent) :
      (liveState.memPct !== null ? liveState.memPct : null);

    setDonutProgress(
      dash.querySelector('[data-ring-card="cpu"]'),
      cpuPct || 0,
      cpuPct === null ? '--' : cpuPct + '%'
    );
    setText(dash, '[data-ov-cpu-stat]', cpuPct === null ? '--' : cpuPct + '%');
    setText(dash, '[data-ov-disk-stat]', diskPct === null ? '--' : diskPct + '%');

    setText(dash, '[data-res-mem-text]', memUsedObj.text !== '--' ?
      memUsedObj.text : (memPct === null ? '--' : memPct + '%'));
    setText(dash, '[data-res-disk-text]', diskObj.text !== '--' ?
      diskObj.text : (diskPct === null ? '--' : diskPct + '%'));
    var memBar = dash.querySelector('[data-res-mem-bar]');
    var diskBar = dash.querySelector('[data-res-disk-bar]');
    if (memBar)
      memBar.style.width = Math.max(0, Math.min(100, memPct || 0)) + '%';
    if (diskBar)
      diskBar.style.width = Math.max(0, Math.min(100, diskPct || 0)) + '%';

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
    if (isNaN(onlineCount) || onlineCount < 0)
      onlineCount = dhcpCount;

    var wirelessCount = liveState.wirelessClients || 0;
    var wiredCount = Math.max(0, onlineCount - wirelessCount);
    liveState.wiredClients = wiredCount;
    liveState.totalClients = onlineCount;

    setDonutProgress(
      dash.querySelector('[data-ring-card="clients"]'),
      onlineCount > 0 ? Math.min(100, Math.max(10, onlineCount * 5)) : 0,
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
    var tcpCount = liveState.connTotal ?
      liveState.tcpCount : Math.round(connCount * 0.80);
    var udpCount = liveState.connTotal ?
      liveState.udpCount : Math.round(connCount * 0.17);
    var icmpCount = liveState.connTotal ?
      liveState.icmpCount : Math.max(0, connCount - tcpCount - udpCount);

    setDonutProgress(
      dash.querySelector('[data-ring-card="conns"]'),
      connCount > 0 ?
        Math.min(100, Math.max(12, Math.round(connCount / 20))) : 0,
      connCount
    );
    setText(dash, '[data-ov-tcp-stat]', tcpCount);
    setText(dash, '[data-ov-udp-stat]', udpCount);
    setText(dash, '[data-ov-icmp-stat]', icmpCount);

    var netBoxes = extractNetworkBoxes(netSec);
    var allIfaces = liveState.ifaces;
    updateWanSelector(dash, allIfaces);

    var primaryBox = allIfaces.find(function(iface) {
      return iface.devName === liveState.selectedWanKey;
    }) || allIfaces[0] || {};
    if (primaryBox.devName)
      liveState.selectedWanKey = primaryBox.devName;

    var wanSelect = dash.querySelector('[data-wan-switch]');
    if (wanSelect && primaryBox.devName)
      wanSelect.value = primaryBox.devName;

    var cleanIp = primaryBox.addr ? primaryBox.addr.split('/')[0] : '--';
    setText(dash, '[data-ov-ip]', cleanIp);
    setText(
      dash,
      '[data-rate-ifname]',
      hostname + ' ' + (primaryBox.title || '--')
    );

    setText(dash, '[data-wan-ip]', cleanIp);
    setText(dash, '[data-wan-proto]', String(primaryBox.proto || '--').toUpperCase());
    setText(dash, '[data-wan-gw]', primaryBox.gw || '--');
    setText(
      dash,
      '[data-wan-uptime]',
      primaryBox.uptime ? formatUptimeChinese(primaryBox.uptime) : '--'
    );

    if (loadObj.text !== '--')
      setText(dash, '[data-wan-load]', loadObj.text);

    var curTxSpeed = Number(primaryBox.txSpeed) || 0;
    var curRxSpeed = Number(primaryBox.rxSpeed) || 0;
    var curTotalBytes = (Number(primaryBox.rxBytes) || 0) +
      (Number(primaryBox.txBytes) || 0);

    setText(
      dash,
      '[data-wan-total]',
      primaryBox.devName ? formatBytes(curTotalBytes) : '--'
    );
    setText(
      dash,
      '[data-wan-tx]',
      primaryBox.rateReady ? formatRate(curTxSpeed) : '--'
    );
    setText(
      dash,
      '[data-wan-rx]',
      primaryBox.rateReady ? formatRate(curRxSpeed) : '--'
    );

    recordOverviewSamples(wiredCount, wirelessCount, memPct);

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
          value: modelObj.text !== '--' ? modelObj.text : '--'
        },
        {
          key: isChinese ? '目标平台' : 'Target Platform',
          value: targetObj.text !== '--' ? targetObj.text : '--'
        },
        {
          key: isChinese ? '内核版本' : 'Kernel Version',
          value: kernelObj.text !== '--' ? kernelObj.text : '--'
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
          value: loadObj.text !== '--' ? loadObj.text : '--'
        },
        {
          key: isChinese ? 'CPU 状态' : 'CPU Usage',
          value: cpuObj.text !== '--' ? cpuObj.text :
            (cpuPct === null ? '--' : cpuPct + '%')
        },
        {
          key: isChinese ? '处理器架构' : 'Architecture',
          value: archObj.text !== '--' ? archObj.text : '--'
        },
        {
          key: isChinese ? '固件版本' : 'Firmware Version',
          value: fwObj.text !== '--' ? fwObj.text : '--'
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

  HomeUI.pollLiveRouterStats = pollLiveRouterStats;
  HomeUI.pollLiveMemory = pollLiveMemory;
  HomeUI.pollLiveThroughput = pollLiveThroughput;
  HomeUI.getOverviewSectionName = getOverviewSectionName;
  HomeUI.createIkuaiDashboard = createIkuaiDashboard;
  HomeUI.updateOverviewDashboard = updateOverviewDashboard;
})(window);
