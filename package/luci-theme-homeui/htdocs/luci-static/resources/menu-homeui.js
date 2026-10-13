'use strict';
'require baseclass';
'require ui';

const ICONS = {
  overview: '<path fill="currentColor" stroke="none" d="M12 3.2 3.2 10.4a1 1 0 0 0 .63 1.77H5.5v7.33a1 1 0 0 0 1 1h3.8v-5.2h3.4v5.2h3.8a1 1 0 0 0 1-1V12.17h1.67a1 1 0 0 0 .63-1.77L12 3.2z"/>',
  status: '<path fill="currentColor" stroke="none" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6v2h3a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h3v-2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2.8 9.2 3.1-3.1 2.4 2.4 4.3-4.3a.9.9 0 0 0-1.27-1.27L12.3 10l-2.4-2.4-4.37 4.33a.9.9 0 1 0 1.27 1.27z"/>',
  system: '<path fill="currentColor" stroke="none" d="M19.4 13c.04-.33.07-.66.07-1s-.03-.67-.07-1l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.03 7.03 0 0 0-1.73-1l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.63.25-1.21.59-1.73 1l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.49.49 0 0 0 .12.64L4.54 11c-.04.33-.07.67-.07 1s.03.67.07 1l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.49-1c.52.41 1.1.75 1.73 1l.38 2.65c.05.24.25.42.49.42h4c.24 0 .44-.18.49-.42l.38-2.65c.63-.25 1.21-.59 1.73-1l2.49 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64L19.4 13zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>',
  services: '<path fill="currentColor" stroke="none" d="M4 4h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-3 7h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zm3 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>',
  network: '<path fill="currentColor" stroke="none" d="M10 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1v2.2h6a1 1 0 0 1 1 1V15h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1v-1.8H7V15h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1v-2.8a1 1 0 0 1 1-1h6V9h-1a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>',
  docker: '<rect x="3" y="10" width="4" height="4" rx=".6"/>' +
    '<rect x="8" y="10" width="4" height="4" rx=".6"/>' +
    '<rect x="13" y="10" width="4" height="4" rx=".6"/>' +
    '<rect x="8" y="5" width="4" height="4" rx=".6"/>' +
    '<path d="M2 14.5c1 3.5 4.2 5.5 9.5 5.5 6 0 9.5-3 10.5-7' +
    '-1.4-.5-2.8-.3-3.7.4"/>',
  vpn: '<path fill="currentColor" stroke="none" d="M12 2.5 4 6v6c0 5.55 3.4 10.74 8 12 4.6-1.26 8-6.45 8-12V6l-8-3.5zm-1.2 13.2-3.3-3.3 1.4-1.4 1.9 1.9 4.3-4.3 1.4 1.4-5.7 5.7z"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/>' +
    '<path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
  default: '<rect x="4" y="4" width="6" height="6" rx="1.2"/>' +
    '<rect x="14" y="4" width="6" height="6" rx="1.2"/>' +
    '<rect x="4" y="14" width="6" height="6" rx="1.2"/>' +
    '<rect x="14" y="14" width="6" height="6" rx="1.2"/>'
};

const STANDALONE_STATUS_CHILDREN = {
  overview: true,
  processes: true,
  logs: true,
  syslog: true
};

const STANDALONE_SYSTEM_CHILDREN = {
  system: true
};

const SIDE_ICONS = {
  overview: '<path d="M4 13h6V4H4zm10-9v6h6V4zM4 20h6v-4H4zm10 0h6v-7h-6z"/>',
  routes: '<path d="M4 8h13l-3-3m6 11H7l3 3"/>',
  nftables: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  iptables: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  firewall: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  logs: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 2v6h6M8 13h8M8 17h5"/>',
  processes: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  realtime: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  nlbw: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  wireguard: '<circle cx="12" cy="12" r="9"/>' +
    '<path d="M8 12h8M12 8v8"/>',
  network: '<path d="M4 7h16M4 17h16"/><path d="m8 4-3 3 3 3m8 4 3 3-3 3"/>',
  wireless: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/>' +
    '<path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/>',
  dhcp: '<rect x="3" y="5" width="18" height="14" rx="2"/>' +
    '<path d="M7 9h10M7 13h6"/>',
  diagnostics: '<path d="m22 12-4 0-3 9L9 3l-3 9-4 0"/>',
  system: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/>',
  admin: '<path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>' +
    '<path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
  package: '<path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4' +
    'a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4' +
    'a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
  startup: '<path d="M5 3l14 9-14 9V3z"/>',
  crontab: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  mounts: '<ellipse cx="12" cy="5" rx="9" ry="3"/>' +
    '<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  diskman: '<rect x="3" y="4" width="18" height="16" rx="2"/>' +
    '<circle cx="12" cy="11" r="3"/><path d="M8 17h8"/>',
  flash: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  reboot: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
  ttyd: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  passwall: '<circle cx="12" cy="12" r="9"/>' +
    '<path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  ddns: '<path d="M12 2a10 10 0 1 0 10 10H12V2z"/>',
  uugamebooster: '<rect x="2" y="6" width="20" height="12" rx="6"/>' +
    '<path d="M6 12h4M8 10v4m7-1h.01M18 11h.01"/>',
  default: '<circle cx="12" cy="12" r="2.5"/>' +
    '<path d="M4 12h4m8 0h4"/>'
};

function createIcon(name)
{
  const icon = E('span', { 'class': 'homeui-menu-icon' });
  const lower = String(name || '').toLowerCase();
  let key = 'default';

  if (ICONS[lower])
    key = lower;
  else if (lower.includes('docker'))
    key = 'docker';
  else if (lower.includes('passwall') || lower.includes('wireguard') ||
           lower.includes('vpn'))
    key = 'vpn';

  icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    ICONS[key] + '</svg>';
  return icon;
}

function createSideIcon(name)
{
  const icon = E('span', { 'class': 'homeui-side-icon' });
  const lower = String(name || '').toLowerCase();
  let key = 'default';

  Object.keys(SIDE_ICONS).some((candidate) => {
    if (lower === candidate || lower.includes(candidate)) {
      key = candidate;
      return true;
    }
    return false;
  });

  icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    SIDE_ICONS[key] + '</svg>';
  return icon;
}

return baseclass.extend({
  __init__()
  {
    ui.menu.load().then((tree) => this.render(tree));
  },

  render(tree)
  {
    let node = tree;
    let url = '';

    this.renderModeMenu(tree);

    if (L.env.dispatchpath.length >= 1) {
      const mode = L.env.dispatchpath[0];
      node = tree.children[mode];
      url = mode;

      if (node) {
        this.renderMainMenu(node, url);
        this.setupSearch(node, url);
      }
    }

    if (L.env.dispatchpath.length >= 3) {
      node = tree;
      url = '';

      for (let i = 0; i < 3 && node; i++) {
        node = node.children[L.env.dispatchpath[i]];
        url += (url ? '/' : '') + L.env.dispatchpath[i];
      }

      if (node)
        this.renderTabMenu(node, url);
    }
  },

  renderModeMenu(tree)
  {
    const list = document.querySelector('#modemenu');
    const children = ui.menu.getChildren(tree);

    if (!list || children.length <= 1)
      return;

    children.forEach((child, index) => {
      const active = L.env.requestpath.length ?
        child.name === L.env.requestpath[0] : index === 0;

      list.appendChild(E('li', { 'class': active ? 'active' : '' }, [
        E('a', { 'href': L.url(child.name) }, [_(child.title)])
      ]));
    });

    list.style.display = '';
    if (list.parentElement)
      list.parentElement.classList.add('is-visible');
  },

  renderMainMenu(tree, url)
  {
    const rail = document.querySelector('#topmenu');
    const side = document.querySelector('#sidemenu');
    const logoutSlot = document.querySelector('#homeui-logout-slot');
    const sections = ui.menu.getChildren(tree);
    const currentSection = L.env.dispatchpath[1];
    const currentSub = L.env.dispatchpath[2];
    const isChinese = (document.documentElement.lang || '')
      .toLowerCase()
      .startsWith('zh');
    const isOverviewPage =
      currentSection === 'status' &&
      (!currentSub || currentSub === 'overview');
    const isProcessesPage =
      currentSection === 'status' && currentSub === 'processes';
    const isLogsPage =
      currentSection === 'status' &&
      (currentSub === 'logs' || currentSub === 'syslog');
    const isSystemBasicPage =
      currentSection === 'system' && currentSub === 'system';
    const isStandaloneRailPage =
      isOverviewPage || isProcessesPage || isLogsPage || isSystemBasicPage;
    let activeSection = null;

    document.documentElement.classList.toggle(
      'homeui-overview-single-rail',
      isStandaloneRailPage
    );

    const procUtil = document.querySelector('[data-rail-item="processes"]');
    const logsUtil = document.querySelector('[data-rail-item="logs"]');
    const sysUtil = document.querySelector('[data-rail-item="system"]');

    if (procUtil)
      procUtil.classList.toggle('active', isProcessesPage);
    if (logsUtil) {
      logsUtil.classList.toggle('active', isLogsPage);
      const logSpan = logsUtil.querySelector('span');
      if (logSpan)
        logSpan.textContent = isChinese ? '日志' : _('Logs');
    }
    if (sysUtil)
      sysUtil.classList.toggle('active', isSystemBasicPage);

    const statusSection = sections.find((s) => s.name === 'status');
    if (statusSection) {
      const statusChildren = ui.menu.getChildren(statusSection);
      const logNode = statusChildren.find(
        (c) => c.name === 'logs' || c.name === 'syslog'
      );
      if (logsUtil && logNode)
        logsUtil.href = L.url(url, 'status', logNode.name);

      const overviewLabel = isChinese ? '系统概况' : _('Overview');
      const overviewLink = E('a', {
        'href': L.url(url, 'status', 'overview'),
        'title': overviewLabel,
        'aria-label': overviewLabel
      }, [
        createIcon('overview'),
        E('span', {}, [overviewLabel])
      ]);

      rail.appendChild(E('li', {
        'class': isOverviewPage ? 'active' : '',
        'data-menu': 'overview'
      }, [overviewLink]));
    }

    sections.forEach((section, index) => {
      let active = currentSection ?
        section.name === currentSection :
        index === 0;

      if (section.name === 'status' &&
          (isOverviewPage || isProcessesPage || isLogsPage))
        active = false;

      if (section.name === 'system' && isSystemBasicPage)
        active = false;

      let itemUrl = L.url(url, section.name);
      let displayTitle = _(section.title);

      if (section.name === 'status') {
        const statusChildren = ui.menu.getChildren(section);
        const firstMonitor = statusChildren.find(
          (c) => !STANDALONE_STATUS_CHILDREN[c.name]
        );

        if (firstMonitor)
          itemUrl = L.url(url, 'status', firstMonitor.name);

        if (isChinese)
          displayTitle = '监控中心';
      } else if (section.name === 'system') {
        const systemChildren = ui.menu.getChildren(section);
        const firstSystem = systemChildren.find(
          (c) => !STANDALONE_SYSTEM_CHILDREN[c.name]
        );

        if (firstSystem)
          itemUrl = L.url(url, 'system', firstSystem.name);

        if (isChinese)
          displayTitle = '系统管理';
      } else if (section.name === 'network' && isChinese) {
        displayTitle = '网络配置';
      } else if (section.name === 'services' && isChinese) {
        displayTitle = '高级服务';
      }

      const icon = createIcon(section.name);
      const link = E('a', {
        'href': itemUrl,
        'title': displayTitle,
        'aria-label': displayTitle
      }, [icon, E('span', {}, [displayTitle])]);

      if (section.name === 'logout' || /logout|退出/i.test(section.title)) {
        link.classList.add('homeui-logout-link');
        if (logoutSlot)
          logoutSlot.appendChild(link);
        return;
      }

      rail.appendChild(E('li', {
        'class': active ? 'active' : '',
        'data-menu': section.name
      }, [link]));

      if (active)
        activeSection = section;
    });

    if (!activeSection || !side)
      return;

    this.renderSideMenu(
      activeSection,
      url + '/' + activeSection.name,
      side,
      activeSection.name
    );
  },

  renderSideMenu(tree, url, container, sectionName)
  {
    const rawChildren = ui.menu.getChildren(tree);
    const children = rawChildren.filter((child) => {
      if (sectionName === 'status' && STANDALONE_STATUS_CHILDREN[child.name])
        return false;
      if (sectionName === 'system' && STANDALONE_SYSTEM_CHILDREN[child.name])
        return false;
      return true;
    });
    const currentName = L.env.dispatchpath[2];

    children.forEach((child, index) => {
      const active = currentName ? child.name === currentName : index === 0;
      const nested = ui.menu.getChildren(child);
      const item = E('li', {
        'class': active ? 'active' : ''
      });

      item.appendChild(E('a', {
        'href': L.url(url, child.name)
      }, [
        createSideIcon(child.name),
        E('span', {}, [_(child.title)])
      ]));

      if (active && nested.length) {
        const nestedList = E('ul', { 'class': 'homeui-nested-menu' });

        nested.forEach((nestedChild) => {
          const nestedActive = L.env.dispatchpath[3] === nestedChild.name;
          nestedList.appendChild(E('li', {
            'class': nestedActive ? 'active' : ''
          }, [
            E('a', {
              'href': L.url(url, child.name, nestedChild.name)
            }, [_(nestedChild.title)])
          ]));
        });
        item.appendChild(nestedList);
      }

      container.appendChild(item);
    });
  },

  renderTabMenu(tree, url, level)
  {
    const container = document.querySelector('#tabmenu');
    const list = E('ul', { 'class': 'tabs' });
    const children = ui.menu.getChildren(tree);
    let activeNode = null;

    children.forEach((child) => {
      const active = L.env.dispatchpath[3 + (level || 0)] === child.name;
      const className = 'tabmenu-item-' + child.name +
        (active ? ' active' : '');

      list.appendChild(E('li', { 'class': className }, [
        E('a', { 'href': L.url(url, child.name) }, [_(child.title)])
      ]));

      if (active)
        activeNode = child;
    });

    if (!list.children.length)
      return E([]);

    container.appendChild(list);
    container.style.display = '';

    if (activeNode) {
      this.renderTabMenu(
        activeNode,
        url + '/' + activeNode.name,
        (level || 0) + 1
      );
    }

    return list;
  },

  setupSearch(tree, baseUrl)
  {
    const items = [];
    const sections = ui.menu.getChildren(tree);

    sections.forEach((sec) => {
      if (sec.name === 'logout')
        return;

      const secTitle = _(sec.title);
      const children = ui.menu.getChildren(sec);

      if (!children.length) {
        items.push({
          title: secTitle,
          group: secTitle,
          href: L.url(baseUrl, sec.name)
        });
        return;
      }

      children.forEach((child) => {
        const childTitle = _(child.title);
        items.push({
          title: childTitle,
          group: secTitle,
          href: L.url(baseUrl, sec.name, child.name)
        });
      });
    });

    window.__homeuiMenuItems = items;
  }
});
