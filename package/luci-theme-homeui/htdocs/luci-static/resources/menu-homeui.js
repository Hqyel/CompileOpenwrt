'use strict';
'require baseclass';
'require ui';

const ICONS = {
  overview: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>' +
    '<path d="M9.5 20v-6h5v6"/>',
  status: '<rect x="3" y="4" width="18" height="14" rx="2"/>' +
    '<path d="M7 12l3-3 3 3 4-4"/><path d="M8 21h8M12 18v3"/>',
  system: '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1' +
    'a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21' +
    'a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17' +
    'l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H2.8v-4' +
    'H3A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2' +
    'l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3' +
    'a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7' +
    'l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21' +
    'a1.7 1.7 0 0 0-1.6 1z"/>',
  services: '<rect x="3" y="4" width="18" height="6" rx="2"/>' +
    '<rect x="3" y="14" width="18" height="6" rx="2"/>' +
    '<path d="M7 7h.01M7 17h.01"/>',
  network: '<circle cx="12" cy="5" r="2.2"/>' +
    '<circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/>' +
    '<path d="M12 7.2V12m-7 4.8V12h14v4.8"/>',
  docker: '<rect x="3" y="10" width="4" height="4" rx=".6"/>' +
    '<rect x="8" y="10" width="4" height="4" rx=".6"/>' +
    '<rect x="13" y="10" width="4" height="4" rx=".6"/>' +
    '<rect x="8" y="5" width="4" height="4" rx=".6"/>' +
    '<path d="M2 14.5c1 3.5 4.2 5.5 9.5 5.5 6 0 9.5-3 10.5-7' +
    '-1.4-.5-2.8-.3-3.7.4"/>',
  vpn: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
    '<path d="m9 12 2 2 4-4"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/>' +
    '<path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
  default: '<rect x="4" y="4" width="6" height="6" rx="1.2"/>' +
    '<rect x="14" y="4" width="6" height="6" rx="1.2"/>' +
    '<rect x="4" y="14" width="6" height="6" rx="1.2"/>' +
    '<rect x="14" y="14" width="6" height="6" rx="1.2"/>'
};

const SIDE_ICONS = {
  overview: '<path d="M4 13h6V4H4zm10-9v6h6V4zM4 20h6v-4H4zm10 0h6v-7h-6z"/>',
  routes: '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/>' +
    '<circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  nftables: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  iptables: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  firewall: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  logs: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 2v6h6M8 13h8M8 17h5"/>',
  processes: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  realtime: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  nlbw: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
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

    if (!list)
      return;

    children.forEach((child, index) => {
      const active = L.env.requestpath.length ?
        child.name === L.env.requestpath[0] : index === 0;

      list.appendChild(E('li', { 'class': active ? 'active' : '' }, [
        E('a', { 'href': L.url(child.name) }, [_(child.title)])
      ]));
    });

    if (children.length > 1)
      list.style.display = '';
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
    let activeSection = null;

    document.documentElement.classList.toggle(
      'homeui-overview-single-rail',
      isOverviewPage
    );

    const statusSection = sections.find((s) => s.name === 'status');
    if (statusSection) {
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

      if (section.name === 'status' && isOverviewPage)
        active = false;

      let itemUrl = L.url(url, section.name);
      let displayTitle = _(section.title);

      if (section.name === 'status') {
        const statusChildren = ui.menu.getChildren(section);
        const firstMonitor = statusChildren.find(
          (c) => c.name !== 'overview'
        );

        if (firstMonitor)
          itemUrl = L.url(url, 'status', firstMonitor.name);

        if (isChinese)
          displayTitle = '监控中心';
      } else if (section.name === 'network' && isChinese) {
        displayTitle = '网络配置';
      } else if (section.name === 'services' && isChinese) {
        displayTitle = '高级服务';
      } else if (section.name === 'system' && isChinese) {
        displayTitle = '系统管理';
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

      if (active || (section.name === 'status' && isOverviewPage))
        activeSection = section;
    });

    if (!activeSection || !side)
      return;

    this.renderSideMenu(
      activeSection,
      url + '/' + activeSection.name,
      side
    );
  },

  renderSideMenu(tree, url, container)
  {
    const children = ui.menu.getChildren(tree);
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
