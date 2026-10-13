(function(window) {
  'use strict';

  var HomeUI = window.HomeUI;
  var isChinese = HomeUI.isChinese;
  var subpageState = HomeUI.subpageState;
  var formatBytes = HomeUI.formatBytes;
  var escapeHtml = HomeUI.escapeHtml;
  var setText = HomeUI.setText;
  var getSectionHeadingText = HomeUI.getSectionHeadingText;
  var countValidSectionRows = HomeUI.countValidSectionRows;
  var applySubpageFilter = HomeUI.applySubpageFilter;
  var getCellText = HomeUI.getCellText;
  var parseSizeStringToBytes = HomeUI.parseSizeStringToBytes;

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

  HomeUI.enhanceRoutesPage = enhanceRoutesPage;
  HomeUI.enhanceFirewallStatusPage = enhanceFirewallStatusPage;
  HomeUI.enhanceRealtimePage = enhanceRealtimePage;
  HomeUI.enhanceWireguardPage = enhanceWireguardPage;
})(window);
