(function(window) {
  'use strict';

  var HomeUI = window.HomeUI;
  var isChinese = HomeUI.isChinese;
  var escapeHtml = HomeUI.escapeHtml;
  var setText = HomeUI.setText;
  var enhanceAllSelects = HomeUI.enhanceAllSelects;

  function enhanceSectionHead(sec, cat, titleText, countText) {
    if (!sec)
      return;
    if (!sec.classList.contains('homeui-subpage-card'))
      sec.classList.add('homeui-subpage-card', 'homeui-net-card');

    var h = sec.querySelector(':scope > h3:first-child');
    if (!h) {
      h = document.createElement('h3');
      h.textContent = titleText || sec.getAttribute('data-tab-title') || '';
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

  var isEnhancingNet = false;

  function enhanceNetworkInterfacesPage(view)
  {
    if (isEnhancingNet)
      return;
    isEnhancingNet = true;
    try {
      var mapEl = view.querySelector('.cbi-map');
      if (!mapEl)
        return;

      var ifaceSection = view.querySelector('.cbi-section[data-tab="interface"]');
      var deviceSection = view.querySelector('.cbi-section[data-tab="device"]');
      var globalsSection = view.querySelector('.cbi-section[data-tab="globals"]');

      var mainEl = document.querySelector('#maincontent') || view.parentNode;
      var shell = mainEl ? mainEl.querySelector('.homeui-net-shell') : null;
      if (!shell && mainEl) {
        shell = document.createElement('div');
        shell.className = 'homeui-subpage-shell homeui-net-shell';
        shell.innerHTML =
          '<div class="homeui-subpage-metrics">' +
            '<div class="homeui-subpage-metric is-blue">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '网络接口总数' : 'Total Interfaces') + '</span>' +
                '<strong data-net-metric="ifaces">0</strong>' +
                '<small data-net-metric="ifaces-sub">' + (isChinese ? '读取接口状态中...' : 'Loading interfaces...') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-green">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '物理与桥接设备' : 'Devices & Bridges') + '</span>' +
                '<strong data-net-metric="devices">0</strong>' +
                '<small data-net-metric="devices-sub">' + (isChinese ? '底层二层设备与网卡' : 'Physical & virtual devices') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-orange">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? 'IPv4 局域网地址' : 'Primary IPv4 Address') + '</span>' +
                '<strong data-net-metric="lan-ip">--</strong>' +
                '<small data-net-metric="lan-ip-sub">' + (isChinese ? 'LAN 默认网关与子网掩码' : 'Default gateway subnet') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-purple">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '数据流与数据包引导' : 'Packet Steering & ULA') + '</span>' +
                '<strong data-net-metric="features">--</strong>' +
                '<small data-net-metric="features-sub">' + (isChinese ? '多核 RPS 与网络流加速' : 'Multi-core network acceleration') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>';

        var topTabs = mainEl.querySelector(':scope > .tabs');
        if (topTabs)
          mainEl.insertBefore(shell, topTabs);
        else
          mainEl.insertBefore(shell, view);
      }

      var ifaceRows = ifaceSection ?
        ifaceSection.querySelectorAll('.cbi-section-table-row') : [];
      enhanceSectionHead(
        ifaceSection,
        'IFACE',
        isChinese ? '网络接口配置与运行状态' : 'Network Interfaces',
        ifaceRows.length + (isChinese ? ' 个接口' : ' interfaces')
      );

      function enhanceInterfaceRows(sec) {
        if (!sec)
          return;
        var rows = sec.querySelectorAll('.cbi-section-table-row');
        Array.prototype.forEach.call(rows, function(row) {
          var statCell = row.querySelector('[data-name="_ifacestat"]') || row.children[1];
          if (!statCell)
            return;

          var existingCard = statCell.querySelector('.homeui-iface-card-meta');
          var txt = '';
          var rawChildren = [];
          Array.prototype.forEach.call(statCell.childNodes, function(cn) {
            if (cn !== existingCard) {
              txt += (cn.textContent || '') + ' ';
              if (cn.nodeType === 1)
                rawChildren.push(cn);
            }
          });

          if (!txt.trim())
            return;

          if (existingCard && existingCard.dataset.rawTxt === txt)
            return;

          var isUp = /已连接|connected|uptime|运行时间/i.test(txt) &&
            !/未连接|未启动|接口已禁用|disabled|not present|not connected/i.test(txt);
          if (/未连接|not connected/i.test(txt))
            isUp = false;

          var ipv4Matches = txt.match(/\b(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|(?:\d{1,3}\.){3}\d{1,3})(?:\/\d+)?\b/g) || [];
          ipv4Matches = ipv4Matches.filter(function(ip) {
            return !/^255\./.test(ip) && !/^0\.0\.0\.0/.test(ip);
          });

          var ipv6Matches = (txt.match(/\b(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}(?:\/\d+)?\b|\b[0-9a-fA-F]{1,4}::[0-9a-fA-F0-9:]*(?:\/\d+)?\b/gi) || [])
            .filter(function(ip) {
              return !/^[0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5}$/i.test(ip);
            });

          var protoMatch = txt.match(/(?:协议|Protocol)[:：]?\s*([^\n\r]+?)(?=\s*(?:链路状态|Carrier|设备|Device|运行时间|Uptime|MAC|接收|RX|发送|TX|IPv4|IPv6|信息|Information|$))/i);
          var proto = protoMatch ? protoMatch[1].trim() : '';

          var macMatch = txt.match(/([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})/);
          var mac = macMatch ? macMatch[1] : '';

          var uptimeMatch = txt.match(/(?:运行时间|Uptime)[:：]?\s*([0-9a-zA-Z\s天时分秒hdms]+?)(?=\s*(?:MAC|接收|RX|IPv4|IPv6|$))/i);
          var uptime = uptimeMatch ? uptimeMatch[1].trim() : '';

          var rxMatch = txt.match(/(?:接收|RX)[:：]?\s*([0-9.]+\s*[KMGTPE]?i?B)/i);
          var txMatch = txt.match(/(?:发送|TX)[:：]?\s*([0-9.]+\s*[KMGTPE]?i?B)/i);
          var rx = rxMatch ? rxMatch[1] : '';
          var tx = txMatch ? txMatch[1] : '';

          var infoMatch = txt.match(/(?:信息|Information)[:：]?\s*([^\n\r]+?)(?=\s*(?:$))/i);
          var info = infoMatch ? infoMatch[1].trim() : '';

          if (!existingCard) {
            existingCard = document.createElement('div');
            existingCard.className = 'homeui-iface-card-meta';
            statCell.appendChild(existingCard);
          }

          existingCard.dataset.rawTxt = txt;

          rawChildren.forEach(function(el) {
            if (el.style.display !== 'none')
              el.style.display = 'none';
          });

          var ipsHtml = '';
          ipv4Matches.forEach(function(ip) {
            ipsHtml += '<span class="homeui-iface-ip is-ipv4"><span class="ip-tag">IPv4</span>' + escapeHtml(ip) + '</span>';
          });
          ipv6Matches.forEach(function(ip) {
            ipsHtml += '<span class="homeui-iface-ip is-ipv6"><span class="ip-tag">IPv6</span>' + escapeHtml(ip) + '</span>';
          });
          if (!ipv4Matches.length && !ipv6Matches.length && isUp) {
            ipsHtml += '<span class="homeui-iface-ip is-none" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;font-size:11px;font-family:sans-serif">' +
              (isChinese ? '未分配 IP' : 'No IP assigned') + '</span>';
          }

          var chipsHtml = '';
          if (proto)
            chipsHtml += '<span class="homeui-chip"><span class="chip-lbl">' + (isChinese ? '协议' : 'Proto') + ':</span> ' + escapeHtml(proto) + '</span>';
          if (uptime)
            chipsHtml += '<span class="homeui-chip"><span class="chip-lbl">' + (isChinese ? '运行' : 'Uptime') + ':</span> ' + escapeHtml(uptime) + '</span>';
          if (mac)
            chipsHtml += '<span class="homeui-chip is-mac"><span class="chip-lbl">MAC:</span> ' + escapeHtml(mac) + '</span>';
          if (rx)
            chipsHtml += '<span class="homeui-chip is-rx"><svg viewBox="0 0 24 24"><path d="M12 4v16m0 0l-5-5m5 5l5-5"/></svg> ' + escapeHtml(rx) + '</span>';
          if (tx)
            chipsHtml += '<span class="homeui-chip is-tx"><svg viewBox="0 0 24 24"><path d="M12 20V4m0 0l5 5m-5-5l-5 5"/></svg> ' + escapeHtml(tx) + '</span>';
          if (info)
            chipsHtml += '<span class="homeui-chip is-info">' + escapeHtml(info) + '</span>';

          existingCard.innerHTML =
            '<div class="homeui-iface-headline">' +
              '<span class="homeui-iface-status-pill ' + (isUp ? 'is-up' : 'is-down') + '">' +
                '<span class="status-dot"></span>' +
                (isUp ? (isChinese ? '已连接' : 'Connected') : (isChinese ? '未连接' : 'Disconnected')) +
              '</span>' +
              ipsHtml +
            '</div>' +
            (chipsHtml ? ('<div class="homeui-iface-chips">' + chipsHtml + '</div>') : '');
        });
      }

      enhanceInterfaceRows(ifaceSection);

    var devRows = deviceSection ?
      deviceSection.querySelectorAll('.cbi-section-table-row') : [];
    enhanceSectionHead(
      deviceSection,
      'DEVICE',
      isChinese ? '网络设备与虚拟网桥配置' : 'Network Devices',
      devRows.length + (isChinese ? ' 个设备' : ' devices')
    );

    enhanceSectionHead(
      globalsSection,
      'GLOBAL',
      isChinese ? '全局网络与数据包引导选项' : 'Global Network Options',
      isChinese ? '系统协议栈参数' : 'Stack Options'
    );

    if (shell) {
      var connectedIfaces = 0;
      var lanIp = '--';
      Array.prototype.forEach.call(ifaceRows, function(row) {
        var txt = row.textContent || '';
        if (/已连接|connected|uptime|运行时间/i.test(txt))
          connectedIfaces++;
        var ipMatch = txt.match(/\b(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?:\/\d+)?\b/);
        if (ipMatch && lanIp === '--')
          lanIp = ipMatch[0];
      });

      setText(shell, '[data-net-metric="ifaces"]', ifaceRows.length);
      setText(
        shell,
        '[data-net-metric="ifaces-sub"]',
        (isChinese ? '已连接: ' : 'Connected: ') + connectedIfaces + ' · ' +
        (isChinese ? '待命/停止: ' : 'Down: ') + Math.max(0, ifaceRows.length - connectedIfaces)
      );

      setText(shell, '[data-net-metric="devices"]', devRows.length);
      setText(
        shell,
        '[data-net-metric="devices-sub"]',
        isChinese ? '包含网桥、VLAN 及物理网卡' : 'Includes bridges, VLANs & NICs'
      );

      setText(shell, '[data-net-metric="lan-ip"]', lanIp);

      var psVal = globalsSection ?
        (globalsSection.querySelector('[data-name="packet_steering"] select, [data-name="packet_steering"] input') || {}).value : null;
      var psLabel = psVal === '2' ? (isChinese ? '多核全开' : 'All CPUs') :
        (psVal === '0' ? (isChinese ? '已禁用' : 'Disabled') : (isChinese ? '智能引导' : 'Enabled'));
      setText(shell, '[data-net-metric="features"]', psLabel);
      setText(
        shell,
        '[data-net-metric="features-sub"]',
        isChinese ? 'Packet Steering 网络加速' : 'Packet Steering RPS'
      );
    }
  } finally {
    isEnhancingNet = false;
  }
}

  var isEnhancingDiag = false;
  function enhanceDiagnosticsPage(view)
  {
    if (isEnhancingDiag)
      return;
    isEnhancingDiag = true;
    try {
      var mainEl = document.querySelector('#maincontent') || view.parentNode;

      // 1. Metric Overview Shell
      var shell = mainEl ? mainEl.querySelector('.homeui-diag-shell') : null;
      if (!shell && mainEl) {
        shell = document.createElement('div');
        shell.className = 'homeui-subpage-shell homeui-diag-shell';
        shell.innerHTML =
          '<div class="homeui-subpage-metrics">' +
            '<div class="homeui-subpage-metric is-blue">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '连通性测试 (Ping)' : 'ICMP Ping') + '</span>' +
                '<strong data-diag-metric="ping">' + (isChinese ? '双栈探测' : 'Dual-stack') + '</strong>' +
                '<small data-diag-metric="ping-sub">' + (isChinese ? '测试目标主机往返延迟' : 'Round-trip latency test') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-green">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '路由追踪 (Traceroute)' : 'Traceroute') + '</span>' +
                '<strong data-diag-metric="trace">' + (isChinese ? '逐跳分析' : 'Hop-by-hop') + '</strong>' +
                '<small data-diag-metric="trace-sub">' + (isChinese ? '定位中间路由节点与瓶颈' : 'Path & bottleneck analysis') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-orange">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '域名解析 (Nslookup)' : 'Nslookup') + '</span>' +
                '<strong data-diag-metric="dns">' + (isChinese ? 'DNS 解析' : 'DNS Lookup') + '</strong>' +
                '<small data-diag-metric="dns-sub">' + (isChinese ? '验证上游 DNS 解析应答' : 'Upstream DNS validation') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-purple">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '实时回显控制台' : 'Console Stream') + '</span>' +
                '<strong data-diag-metric="status">' + (isChinese ? '就绪' : 'Ready') + '</strong>' +
                '<small data-diag-metric="status-sub">' + (isChinese ? '等待诊断命令触发' : 'Awaiting command trigger') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>';

        mainEl.insertBefore(shell, view);
      }

      // 2. Wrap tools section in Card
      var diagForm = view.querySelector('form, .cbi-map') || view;
      if (!diagForm.classList.contains('homeui-subpage-card')) {
        diagForm.classList.add('homeui-subpage-card', 'homeui-diag-card');
      }

      var head = diagForm.querySelector(':scope > h3:first-child');
      if (!head) {
        head = document.createElement('h3');
        diagForm.insertBefore(head, diagForm.firstChild);
      }
      head.innerHTML = '<span class="homeui-sec-cat is-diag">DIAG</span>' +
        (isChinese ? '网络链路连通性与域名诊断工具' : 'Network Connectivity & DNS Diagnostics');

      // 3. Style action buttons with icons
      var btns = diagForm.querySelectorAll('.cbi-button, input[type="button"], button');
      Array.prototype.forEach.call(btns, function(b) {
        b.classList.add('cbi-button-action');
        var txt = (b.value || b.textContent || '').trim();
        if (/ping/i.test(txt)) {
          b.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;fill:none;stroke:currentColor;stroke-width:2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' + (isChinese ? '测试 Ping' : 'Ping');
        } else if (/traceroute/i.test(txt)) {
          b.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;fill:none;stroke:currentColor;stroke-width:2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>' + (isChinese ? '跟踪路由' : 'Traceroute');
        } else if (/nslookup/i.test(txt)) {
          b.innerHTML = '<svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;fill:none;stroke:currentColor;stroke-width:2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' + (isChinese ? '解析域名' : 'Nslookup');
        }
      });

      // 4. Transform output textarea into modern terminal console
      var outTextarea = view.querySelector('textarea, pre');
      if (outTextarea && !outTextarea.closest('.homeui-terminal-window')) {
        var termWin = document.createElement('div');
        termWin.className = 'homeui-terminal-window';
        termWin.innerHTML =
          '<div class="homeui-terminal-bar">' +
            '<div class="homeui-terminal-dots">' +
              '<span class="homeui-terminal-dot is-red"></span>' +
              '<span class="homeui-terminal-dot is-yellow"></span>' +
              '<span class="homeui-terminal-dot is-green"></span>' +
            '</div>' +
            '<div class="homeui-terminal-title">' + (isChinese ? '诊断控制台回显 (Console Output)' : 'Diagnostic Console Output') + '</div>' +
            '<div class="homeui-terminal-actions">' +
              '<button type="button" class="homeui-terminal-btn" data-term-act="clear">' + (isChinese ? '清空' : 'Clear') + '</button>' +
              '<button type="button" class="homeui-terminal-btn" data-term-act="copy">' + (isChinese ? '复制' : 'Copy') + '</button>' +
            '</div>' +
          '</div>';

        outTextarea.parentNode.insertBefore(termWin, outTextarea);
        termWin.appendChild(outTextarea);

        var clearBtn = termWin.querySelector('[data-term-act="clear"]');
        if (clearBtn) {
          clearBtn.addEventListener('click', function() {
            if (outTextarea.tagName === 'TEXTAREA')
              outTextarea.value = '';
            else
              outTextarea.textContent = '';
          });
        }

        var copyBtn = termWin.querySelector('[data-term-act="copy"]');
        if (copyBtn) {
          copyBtn.addEventListener('click', function() {
            var val = outTextarea.value || outTextarea.textContent || '';
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(val);
              copyBtn.textContent = isChinese ? '已复制!' : 'Copied!';
              setTimeout(function() { copyBtn.textContent = isChinese ? '复制' : 'Copy'; }, 1500);
            }
          });
        }
      }

      if (typeof enhanceAllSelects === 'function')
        enhanceAllSelects(view);

    } finally {
      isEnhancingDiag = false;
    }
  }

  var isEnhancingDns = false;
  function enhanceDnsPage(view)
  {
    if (isEnhancingDns)
      return;
    isEnhancingDns = true;
    try {
      var mainEl = document.querySelector('#maincontent') || view.parentNode;

      // 1. Metric Overview Shell
      var shell = mainEl ? mainEl.querySelector('.homeui-dns-shell') : null;
      if (!shell && mainEl) {
        shell = document.createElement('div');
        shell.className = 'homeui-subpage-shell homeui-dns-shell';
        shell.innerHTML =
          '<div class="homeui-subpage-metrics">' +
            '<div class="homeui-subpage-metric is-blue">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? 'DNS 解析服务' : 'DNS Forwarder') + '</span>' +
                '<strong data-dns-metric="engine">Dnsmasq</strong>' +
                '<small data-dns-metric="engine-sub">' + (isChinese ? '标准 53 端口本地域名转发' : 'Port 53 Resolver') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-green">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '缓存与静态记录' : 'Cache & Records') + '</span>' +
                '<strong data-dns-metric="cache">' + (isChinese ? '本地缓存' : 'Local Cache') + '</strong>' +
                '<small data-dns-metric="cache-sub">' + (isChinese ? '降低上游解析延迟与请求频次' : 'Latency reduction & caching') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-orange">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '上游 DNS 转发' : 'Upstream DNS') + '</span>' +
                '<strong data-dns-metric="servers">' + (isChinese ? '系统分流' : 'System servers') + '</strong>' +
                '<small data-dns-metric="servers-sub">' + (isChinese ? '自动继承 WAN 分配或自定义' : 'WAN DHCP or manual') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-purple">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '安全与防污染' : 'DNSSEC & Filter') + '</span>' +
                '<strong data-dns-metric="sec">' + (isChinese ? '安全防护' : 'Security') + '</strong>' +
                '<small data-dns-metric="sec-sub">' + (isChinese ? 'DNSSEC 验证与重定向保护' : 'DNSSEC & rebind protect') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>';

        var topTabs = mainEl.querySelector(':scope > .tabs, :scope > .cbi-tabmenu');
        if (topTabs)
          mainEl.insertBefore(shell, topTabs);
        else
          mainEl.insertBefore(shell, view);
      }

      // 2. Style sections across DNS tabs
      var sections = view.querySelectorAll('.cbi-section');
      Array.prototype.forEach.call(sections, function(sec) {
        var h3 = sec.querySelector(':scope > h3:first-child');
        var headTxt = (h3 ? h3.textContent : sec.textContent || '').trim();

        if (/常规|General/i.test(headTxt)) {
          enhanceSectionHead(sec, 'SETTING', isChinese ? 'DNS 常规参数配置' : 'General DNS Settings', isChinese ? '全局解析' : 'Global');
        } else if (/缓存|Cache/i.test(headTxt)) {
          enhanceSectionHead(sec, 'CACHE', isChinese ? 'DNS 本地缓存与条目上限' : 'DNS Cache Settings', isChinese ? '高速缓存' : 'Cache');
        } else if (/端口|Port|监听/i.test(headTxt)) {
          enhanceSectionHead(sec, 'PORT', isChinese ? '服务端口与监听接口绑定' : 'Ports & Listen Interfaces', isChinese ? '接口监听' : 'Listen');
        } else if (/记录|Record/i.test(headTxt)) {
          enhanceSectionHead(sec, 'RECORD', isChinese ? '静态 DNS 解析记录' : 'Static DNS Records', isChinese ? '自定义条目' : 'Custom');
        } else if (/DNSSEC/i.test(headTxt)) {
          enhanceSectionHead(sec, 'SEC', isChinese ? 'DNSSEC 签名验证与防污染' : 'DNSSEC Validation', isChinese ? '安全验证' : 'Security');
        } else if (/筛选|Filter/i.test(headTxt)) {
          enhanceSectionHead(sec, 'FILTER', isChinese ? '域名与查询过滤' : 'Query Filters', isChinese ? '过滤规则' : 'Filters');
        } else if (/转发|Forward/i.test(headTxt)) {
          enhanceSectionHead(sec, 'FORWARD', isChinese ? '上游 DNS 转发服务器' : 'Upstream Forwarding', isChinese ? '上游服务' : 'Upstream');
        } else if (/高级|Advanced/i.test(headTxt)) {
          enhanceSectionHead(sec, 'ADVANCED', isChinese ? 'DNS 高级特性参数' : 'Advanced DNS Settings', isChinese ? '进阶选项' : 'Advanced');
        } else if (/HOSTS/i.test(headTxt)) {
          enhanceSectionHead(sec, 'HOSTS', isChinese ? 'Resolv 与 HOSTS 映射文件' : 'Resolv and HOSTS Files', isChinese ? '静态映射' : 'Hosts');
        } else if (/IP 集|IP Set/i.test(headTxt)) {
          enhanceSectionHead(sec, 'IPSET', isChinese ? 'DNS 匹配与 IP 集合' : 'DNS IP Sets', isChinese ? '动态集' : 'IPSets');
        } else {
          enhanceSectionHead(sec, 'DNS', headTxt || (isChinese ? 'DNS 配置参数' : 'DNS Configuration'));
        }
      });

      if (typeof enhanceAllSelects === 'function')
        enhanceAllSelects(view);

    } finally {
      isEnhancingDns = false;
    }
  }

  var isEnhancingDhcp = false;
  function enhanceDhcpPage(view)
  {
    if (isEnhancingDhcp)
      return;
    isEnhancingDhcp = true;
    try {
      var mainEl = document.querySelector('#maincontent') || view.parentNode;

      // 1. Metric Overview Shell
      var shell = mainEl ? mainEl.querySelector('.homeui-dhcp-shell') : null;
      if (!shell && mainEl) {
        shell = document.createElement('div');
        shell.className = 'homeui-subpage-shell homeui-dhcp-shell';
        shell.innerHTML =
          '<div class="homeui-subpage-metrics">' +
            '<div class="homeui-subpage-metric is-blue">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '活动 DHCPv4 客户端' : 'Active DHCPv4 Leases') + '</span>' +
                '<strong data-dhcp-metric="v4">0</strong>' +
                '<small data-dhcp-metric="v4-sub">' + (isChinese ? '局域网在线 IPv4 动态分配' : 'Assigned IPv4 clients') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-green">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '活动 DHCPv6 客户端' : 'Active DHCPv6 Leases') + '</span>' +
                '<strong data-dhcp-metric="v6">0</strong>' +
                '<small data-dhcp-metric="v6-sub">' + (isChinese ? '已分配 IPv6 前缀与 DUID' : 'Assigned IPv6 prefixes') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-orange">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '静态保留绑定' : 'Static Leases') + '</span>' +
                '<strong data-dhcp-metric="static">0</strong>' +
                '<small data-dhcp-metric="static-sub">' + (isChinese ? '固定 MAC 与 IP 地址绑定' : 'Reserved IP addresses') + '</small>' +
              '</div>' +
            '</div>' +
            '<div class="homeui-subpage-metric is-purple">' +
              '<div class="metric-icon">' +
                '<svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
              '</div>' +
              '<div class="metric-meta">' +
                '<span>' + (isChinese ? '服务工作模式' : 'Service Stack') + '</span>' +
                '<strong data-dhcp-metric="mode">Dnsmasq + odhcpd</strong>' +
                '<small data-dhcp-metric="mode-sub">' + (isChinese ? '双栈自动地址分配已启用' : 'Dual-stack DHCP service') + '</small>' +
              '</div>' +
            '</div>' +
          '</div>';

        var topTabs = mainEl.querySelector(':scope > .tabs, :scope > .cbi-tabmenu');
        if (topTabs)
          mainEl.insertBefore(shell, topTabs);
        else
          mainEl.insertBefore(shell, view);
      }

      // 2. Style sections and tables
      var sections = view.querySelectorAll('.cbi-section');
      var staticCount = 0;
      var v4Count = 0;
      var v6Count = 0;

      Array.prototype.forEach.call(sections, function(sec) {
        var h3 = sec.querySelector(':scope > h3:first-child');
        var headTxt = (h3 ? h3.textContent : sec.textContent || '').trim();
        var rows = sec.querySelectorAll('.cbi-section-table-row:not(.cbi-section-table-titles)');

        if (/静态租约|Static Leases/i.test(headTxt)) {
          staticCount = rows.length;
          enhanceSectionHead(
            sec,
            'STATIC',
            isChinese ? '静态 IP 地址分配与主机绑定' : 'Static Lease Reservations',
            rows.length + (isChinese ? ' 条绑定' : ' reservations')
          );
        } else if (/DHCPv4/i.test(headTxt)) {
          v4Count = rows.length;
          enhanceSectionHead(
            sec,
            'IPV4',
            isChinese ? '活动 DHCPv4 地址租约列表' : 'Active DHCPv4 Leases',
            rows.length + (isChinese ? ' 个客户端' : ' clients')
          );
        } else if (/DHCPv6/i.test(headTxt)) {
          v6Count = rows.length;
          enhanceSectionHead(
            sec,
            'IPV6',
            isChinese ? '活动 DHCPv6 地址与前缀租约' : 'Active DHCPv6 Leases',
            rows.length + (isChinese ? ' 个客户端' : ' clients')
          );
        } else if (/dnsmasq/i.test(headTxt)) {
          enhanceSectionHead(sec, 'DNSMASQ', isChinese ? 'Dnsmasq 服务高级参数' : 'Dnsmasq Server Options');
        } else if (/odhcpd/i.test(headTxt)) {
          enhanceSectionHead(sec, 'ODHCPD', isChinese ? 'odhcpd IPv6 服务参数' : 'odhcpd IPv6 Options');
        } else {
          enhanceSectionHead(sec, 'DHCP', headTxt || (isChinese ? 'DHCP 服务配置' : 'DHCP Configuration'));
        }
      });

      // Update metrics from DOM counts
      if (shell) {
        setText(shell, '[data-dhcp-metric="static"]', staticCount + (isChinese ? ' 条' : ' items'));
        setText(shell, '[data-dhcp-metric="v4"]', v4Count + (isChinese ? ' 个' : ' online'));
        setText(shell, '[data-dhcp-metric="v6"]', v6Count + (isChinese ? ' 个' : ' online'));
      }

      // Polish empty table cells
      var emptyCells = view.querySelectorAll('.cbi-section-table-row em, .table em');
      Array.prototype.forEach.call(emptyCells, function(em) {
        var row = em.closest('tr, .tr');
        if (row && !row.dataset.homeuiEmptyStyled) {
          row.dataset.homeuiEmptyStyled = 'true';
          em.classList.add('homeui-table-empty');
          em.innerHTML = '<span class="homeui-empty-dot"></span>' + (em.textContent || '').trim();
        }
      });

      // Polish Add button
      var addBtns = view.querySelectorAll('.cbi-section-create .cbi-button, .cbi-section-create input[type="submit"]');
      Array.prototype.forEach.call(addBtns, function(btn) {
        if (!btn.querySelector('svg') && !btn.textContent.includes('+')) {
          var orig = btn.textContent.trim();
          if (orig === '添加' || orig === 'Add')
            btn.textContent = '+ ' + orig;
        }
      });

      if (typeof enhanceAllSelects === 'function')
        enhanceAllSelects(view);

    } finally {
      isEnhancingDhcp = false;
    }
  }

  HomeUI.enhanceNetworkInterfacesPage = enhanceNetworkInterfacesPage;
  HomeUI.enhanceDiagnosticsPage = enhanceDiagnosticsPage;
  HomeUI.enhanceDnsPage = enhanceDnsPage;
  HomeUI.enhanceDhcpPage = enhanceDhcpPage;
})(window);
