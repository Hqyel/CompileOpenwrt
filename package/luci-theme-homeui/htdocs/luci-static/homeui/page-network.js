(function(window) {
  'use strict';

  var HomeUI = window.HomeUI;
  var isChinese = HomeUI.isChinese;
  var escapeHtml = HomeUI.escapeHtml;
  var setText = HomeUI.setText;

  function enhanceNetworkInterfacesPage(view)
  {
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

    function enhanceSectionHead(sec, cat, titleText, countText) {
      if (!sec)
        return;
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
      catBadge.textContent = cat;

      var countBadge = h.querySelector('.homeui-sec-count');
      if (!countBadge) {
        countBadge = document.createElement('span');
        countBadge.className = 'homeui-sec-count';
        h.appendChild(countBadge);
      }
      if (countText !== undefined)
        countBadge.textContent = countText;
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

        rawChildren.forEach(function(el) {
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
  }

  HomeUI.enhanceNetworkInterfacesPage = enhanceNetworkInterfacesPage;
})(window);
