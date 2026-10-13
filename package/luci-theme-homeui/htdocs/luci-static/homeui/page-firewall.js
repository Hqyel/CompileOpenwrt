(function(window) {
  'use strict';

  var HomeUI = window.HomeUI;
  var isChinese = HomeUI.isChinese;
  var escapeHtml = HomeUI.escapeHtml;
  var setText = HomeUI.setText;
  var enhanceAllSelects = HomeUI.enhanceAllSelects;

  var isEnhancingFirewall = false;

  function enhanceFirewallPage(view, pageId)
  {
    if (isEnhancingFirewall)
      return;
    isEnhancingFirewall = true;

    try {
      var mapEl = view.querySelector('.cbi-map') || view;
      var mainEl = document.querySelector('#maincontent') || view.parentNode;

      // 1. Insert or reuse top Metric Overview Shell
      var shell = mainEl ? mainEl.querySelector('.homeui-fw-shell') : null;
      if (!shell && mainEl) {
        shell = document.createElement('div');
        shell.className = 'homeui-subpage-shell homeui-fw-shell';
        shell.innerHTML =
          '<div class="homeui-subpage-metrics">' +
            '<div class="homeui-subpage-metric is-blue">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '防火墙安全区域' : 'Firewall Zones') + '</span>' +
                '<strong data-fw-metric="zones">--</strong>' +
                '<small data-fw-metric="zones-sub">' + (isChinese ? 'WAN / LAN 流量隔离与边界' : 'Zone isolation & boundaries') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-green">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '活动端口转发' : 'Port Forwards') + '</span>' +
                '<strong data-fw-metric="forwards">--</strong>' +
                '<small data-fw-metric="forwards-sub">' + (isChinese ? '外网端口映射至内网主机' : 'External ports mapped to LAN') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-orange">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? 'ACL 通信规则' : 'Traffic Rules') + '</span>' +
                '<strong data-fw-metric="rules">--</strong>' +
                '<small data-fw-metric="rules-sub">' + (isChinese ? '跨区域与本机访问控制' : 'Access control & packet filter') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-purple">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '核心防御与加速' : 'Defense & Offload') + '</span>' +
                '<strong data-fw-metric="features">--</strong>' +
                '<small data-fw-metric="features-sub">' + (isChinese ? 'SYN-Flood 抑制与流表加速' : 'SYN defense & flow offload') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>';

        var topTabs = mainEl.querySelector('.tabs, .cbi-tabmenu');
        if (topTabs && topTabs.parentNode)
          topTabs.parentNode.insertBefore(shell, topTabs);
        else if (mapEl && mapEl.parentNode)
          mapEl.parentNode.insertBefore(shell, mapEl);
        else
          mainEl.insertBefore(shell, mainEl.firstChild);
      }

      // Helper to style section headers with iKuai badges
      function enhanceSectionHead(sec, cat, titleText, countText) {
        if (!sec)
          return;
        if (!sec.classList.contains('homeui-subpage-card'))
          sec.classList.add('homeui-subpage-card', 'homeui-fw-card');

        var h = sec.querySelector(':scope > h3:first-child');
        if (!h) {
          h = document.createElement('h3');
          h.textContent = titleText || '';
          sec.insertBefore(h, sec.firstChild);
        }

        var catBadge = h.querySelector('.homeui-sec-cat');
        if (!catBadge) {
          catBadge = document.createElement('span');
          catBadge.className = 'homeui-sec-cat is-' + cat.toLowerCase();
          h.insertBefore(catBadge, h.firstChild);
        }
        if (catBadge.textContent !== cat)
          catBadge.textContent = cat;

        var countBadge = h.querySelector('.homeui-sec-count');
        if (!countBadge) {
          countBadge = document.createElement('span');
          countBadge.className = 'homeui-sec-count';
          h.appendChild(countBadge);
        }
        if (countText !== undefined && countBadge.textContent !== countText)
          countBadge.textContent = countText;
      }

      // 2. Scan and adapt sections across the 5 tabs
      var sections = view.querySelectorAll('.cbi-section');
      Array.prototype.forEach.call(sections, function(sec) {
        var h3 = sec.querySelector(':scope > h3:first-child');
        var headTxt = (h3 ? h3.textContent : sec.textContent || '').trim();
        var rows = sec.querySelectorAll('.cbi-section-table-row:not(.cbi-section-table-titles)');

        if (/常规设置|General Settings/i.test(headTxt)) {
          enhanceSectionHead(
            sec,
            'SETTING',
            isChinese ? '防火墙常规参数配置' : 'General Firewall Settings',
            isChinese ? '全局策略' : 'Global Policies'
          );
        } else if (/卸载|Offload/i.test(headTxt)) {
          enhanceSectionHead(
            sec,
            'OFFLOAD',
            isChinese ? '路由与 NAT 流表加速卸载' : 'Flow Offloading',
            isChinese ? '内核与硬件加速' : 'Kernel & HW Acceleration'
          );
        } else if (/区域|Zones/i.test(headTxt) || (pageId === 'admin-network-firewall' && rows.length > 0)) {
          enhanceSectionHead(
            sec,
            'ZONE',
            isChinese ? '防火墙安全区域与转发策略' : 'Firewall Zones & Forwarding',
            rows.length + (isChinese ? ' 个安全区域' : ' Zones')
          );
        } else if (/端口转发|Port Forwards/i.test(headTxt) || pageId === 'admin-network-firewall-forwards') {
          enhanceSectionHead(
            sec,
            'FORWARD',
            isChinese ? '端口映射与对外服务转发' : 'Port Forwarding Rules',
            rows.length + (isChinese ? ' 条转发规则' : ' Rules')
          );
        } else if (/通信规则|Traffic Rules/i.test(headTxt) || pageId === 'admin-network-firewall-rules') {
          enhanceSectionHead(
            sec,
            'RULE',
            isChinese ? 'ACL 通信与数据包过滤策略' : 'Traffic Rules & ACL',
            rows.length + (isChinese ? ' 条过滤规则' : ' Rules')
          );
        } else if (/NAT|SNAT/i.test(headTxt) || pageId === 'admin-network-firewall-snats') {
          enhanceSectionHead(
            sec,
            'NAT',
            isChinese ? '源地址转换与动态伪装 (SNAT)' : 'Custom NAT & SNAT Rules',
            rows.length + (isChinese ? ' 条规则' : ' Rules')
          );
        } else if (/IP 集|IP Sets/i.test(headTxt) || pageId === 'admin-network-firewall-ipsets') {
          enhanceSectionHead(
            sec,
            'IPSET',
            isChinese ? 'IP 集合与高效地址匹配' : 'IP Sets',
            rows.length + (isChinese ? ' 个集合' : ' Sets')
          );
        }
      });

      // 3. Polish Table Filter Inputs
      var filterInputs = view.querySelectorAll('.cbi-section-table-titles input, .table .th input');
      Array.prototype.forEach.call(filterInputs, function(inp) {
        if (!inp.getAttribute('placeholder')) {
          var th = inp.closest('.th') || inp.parentElement;
          var title = (th ? th.textContent : '').replace(/筛选|Filter/g, '').trim();
          inp.setAttribute('placeholder', (isChinese ? '筛选 ' : 'Filter ') + (title || '...'));
        }
      });

      // 4. Polish Action Buttons
      var addBtns = view.querySelectorAll('.cbi-section-create .cbi-button, .cbi-section-create input[type="submit"]');
      Array.prototype.forEach.call(addBtns, function(btn) {
        if (!btn.querySelector('svg') && !btn.textContent.includes('+')) {
          var orig = btn.textContent.trim();
          if (orig === '添加' || orig === 'Add')
            btn.textContent = '+ ' + orig;
        }
      });

      // 5. Gather Baseline DOM metrics
      if (shell) {
        var zoneCount = 0;
        var forwardCount = 0;
        var ruleCount = 0;

        var zoneSec = view.querySelector('.cbi-section-table');
        if (pageId === 'admin-network-firewall' && zoneSec) {
          zoneCount = zoneSec.querySelectorAll('.cbi-section-table-row:not(.cbi-section-table-titles)').length;
          if (zoneCount > 0)
            setText(shell, '[data-fw-metric="zones"]', zoneCount + (isChinese ? ' 个区域' : ' Zones'));
        } else if (pageId === 'admin-network-firewall-forwards' && zoneSec) {
          forwardCount = zoneSec.querySelectorAll('.cbi-section-table-row:not(.cbi-section-table-titles)').length;
          setText(shell, '[data-fw-metric="forwards"]', forwardCount + (isChinese ? ' 条' : ' rules'));
        } else if (pageId === 'admin-network-firewall-rules' && zoneSec) {
          ruleCount = zoneSec.querySelectorAll('.cbi-section-table-row:not(.cbi-section-table-titles)').length;
          setText(shell, '[data-fw-metric="rules"]', ruleCount + (isChinese ? ' 条' : ' rules'));
        }

        // Check general defense checkboxes if on Tab 1
        var synInp = view.querySelector('input[name*="syn_flood"], input[name*="synflood"]');
        var fcInp = view.querySelector('input[name*="fullcone"]');
        var offloadSel = view.querySelector('select[name*="offloading"], select[name*="flow_offloading"]');
        var feats = [];
        if (synInp && synInp.checked)
          feats.push(isChinese ? 'SYN防护' : 'SYN Defense');
        if (fcInp && fcInp.checked)
          feats.push('FullCone');
        if (offloadSel && offloadSel.value && offloadSel.value !== '0')
          feats.push(isChinese ? '流量加速' : 'Offload');

        if (feats.length) {
          setText(shell, '[data-fw-metric="features"]', feats.join(' · '));
          setText(shell, '[data-fw-metric="features-sub"]', isChinese ? 'SYN-Flood 抑制与 NAT 加速已启用' : 'SYN Defense & NAT Offload enabled');
        }
      }

      // 6. Enrich with complete UCI firewall configuration if available
      if (window.L && window.L.uci && typeof window.L.uci.load === 'function' && shell) {
        window.L.uci.load('firewall').then(function() {
          var zones = window.L.uci.sections('firewall', 'zone') || [];
          var redirects = window.L.uci.sections('firewall', 'redirect') || [];
          var rules = window.L.uci.sections('firewall', 'rule') || [];
          var defaults = (window.L.uci.sections('firewall', 'defaults') || [])[0] || {};

          setText(shell, '[data-fw-metric="zones"]', zones.length + (isChinese ? ' 个区域' : ' Zones'));
          var zoneNames = zones.map(function(z) { return z.name; }).filter(Boolean).slice(0, 4).join(' / ').toUpperCase();
          setText(
            shell,
            '[data-fw-metric="zones-sub"]',
            zoneNames ? (zoneNames + (isChinese ? ' 流量隔离' : ' isolation')) : (isChinese ? '网络流量边界隔离' : 'Traffic boundaries')
          );

          setText(shell, '[data-fw-metric="forwards"]', redirects.length + (isChinese ? ' 条' : ' rules'));
          var activeForwards = redirects.filter(function(r) { return r.enabled !== '0'; }).length;
          setText(
            shell,
            '[data-fw-metric="forwards-sub"]',
            (isChinese ? '活动映射: ' : 'Active: ') + activeForwards + ' · ' +
            (isChinese ? '停用: ' : 'Disabled: ') + (redirects.length - activeForwards)
          );

          setText(shell, '[data-fw-metric="rules"]', rules.length + (isChinese ? ' 条' : ' rules'));
          var activeRules = rules.filter(function(r) { return r.enabled !== '0'; }).length;
          setText(
            shell,
            '[data-fw-metric="rules-sub"]',
            (isChinese ? '生效规则: ' : 'Active: ') + activeRules + ' · ' +
            (isChinese ? '禁用: ' : 'Disabled: ') + (rules.length - activeRules)
          );

          var activeFeats = [];
          if (defaults.syn_flood === '1' || defaults.synflood_protect === '1')
            activeFeats.push(isChinese ? 'SYN防护' : 'SYN Flood');
          if (defaults.fullcone === '1')
            activeFeats.push('FullCone');
          if (defaults.flow_offloading === '1') {
            activeFeats.push(defaults.flow_offloading_hw === '1' ?
              (isChinese ? '硬件加速' : 'HW Offload') :
              (isChinese ? '软件加速' : 'SW Offload'));
          }

          var featText = activeFeats.length ? activeFeats.join(' · ') : (isChinese ? '标准过滤模式' : 'Standard Filtering');
          setText(shell, '[data-fw-metric="features"]', featText);
          setText(
            shell,
            '[data-fw-metric="features-sub"]',
            isChinese ? '核心安全防御与流表直通加速' : 'Core packet defense & hardware flow acceleration'
          );
        }).catch(function() {});
      }

      // 7. Enhance all select controls on this page
      if (typeof enhanceAllSelects === 'function')
        enhanceAllSelects(view);

      // 8. Compact and clean table rows for 5-column firewall rule tables
      setupFirewallTableObserver(view);

    } finally {
      isEnhancingFirewall = false;
    }
  }

  var isCleaningRows = false;
  function cleanFirewallTableRows(root)
  {
    if (isCleaningRows || !root)
      return;
    isCleaningRows = true;
    try {
      var rows = root.querySelectorAll('.cbi-section-table-row:not(.cbi-section-table-titles)');
      Array.prototype.forEach.call(rows, function(row) {
        var cells = row.children;
        // Tab 2, 3, 4, 5 tables have matchCell at index 1 and actCell at index 2
        if (cells.length >= 4) {
          var matchCell = cells[1];
          if (matchCell && !matchCell.dataset.homeuiCleaned) {
            matchCell.dataset.homeuiCleaned = 'true';
            var brs = matchCell.querySelectorAll('br');
            Array.prototype.forEach.call(brs, function(br) {
              var sep = document.createElement('span');
              sep.className = 'homeui-fw-sep';
              sep.textContent = '·';
              br.parentNode.replaceChild(sep, br);
            });
          }
          var actCell = cells[2];
          if (actCell && !actCell.dataset.homeuiCleaned) {
            actCell.dataset.homeuiCleaned = 'true';
            var brs = actCell.querySelectorAll('br');
            Array.prototype.forEach.call(brs, function(br) {
              var sep = document.createElement('span');
              sep.className = 'homeui-fw-sep';
              sep.textContent = ' ';
              br.parentNode.replaceChild(sep, br);
            });
          }
        }
      });
    } finally {
      isCleaningRows = false;
    }
  }

  function setupFirewallTableObserver(view)
  {
    if (!view)
      return;

    var tables = view.querySelectorAll('.cbi-section-table, .table');
    Array.prototype.forEach.call(tables, function(tbl) {
      var ths = tbl.querySelectorAll('.cbi-section-table-titles > th, .cbi-section-table-titles > .th');
      if (ths.length === 5) {
        tbl.classList.add('homeui-fw-compact-table');
      }
      cleanFirewallTableRows(tbl);

      if (!tbl._homeuiTableObserver && window.MutationObserver) {
        var obs = new MutationObserver(function() {
          cleanFirewallTableRows(tbl);
        });
        obs.observe(tbl, { childList: true, subtree: true });
        tbl._homeuiTableObserver = obs;
      }
    });

    if (!view._homeuiFwViewObserver && window.MutationObserver) {
      var viewTimer = null;
      var viewObs = new MutationObserver(function(mutations) {
        var hasNewTable = false;
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (n.nodeType === 1 && (n.matches && (n.matches('.cbi-section-table, .table, .cbi-section') || n.querySelector('.cbi-section-table, .table')))) {
              hasNewTable = true;
              break;
            }
          }
          if (hasNewTable) break;
        }
        if (hasNewTable) {
          clearTimeout(viewTimer);
          viewTimer = setTimeout(function() {
            setupFirewallTableObserver(view);
          }, 50);
        }
      });
      viewObs.observe(view, { childList: true, subtree: true });
      view._homeuiFwViewObserver = viewObs;
    }
  }

  HomeUI.enhanceFirewallPage = enhanceFirewallPage;
})(window);
