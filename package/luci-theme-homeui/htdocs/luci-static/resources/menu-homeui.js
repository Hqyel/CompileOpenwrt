'use strict';
'require baseclass';
'require ui';

const ICONS = {
  status: '<path d="M4 18V8m6 10V4m6 14v-7m6 7V2"/>',
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
  services: '<rect x="3" y="4" width="18" height="5" rx="2"/>' +
    '<rect x="3" y="15" width="18" height="5" rx="2"/>' +
    '<path d="M7 6.5h.01M7 17.5h.01"/>',
  network: '<circle cx="12" cy="5" r="2"/>' +
    '<circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>' +
    '<path d="M12 7v4M5 17v-3h14v3"/>',
  vpn: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
    '<path d="m9 12 2 2 4-4"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/>' +
    '<path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
  default: '<rect x="4" y="4" width="6" height="6" rx="1"/>' +
    '<rect x="14" y="4" width="6" height="6" rx="1"/>' +
    '<rect x="4" y="14" width="6" height="6" rx="1"/>' +
    '<rect x="14" y="14" width="6" height="6" rx="1"/>'
};

function createIcon(name)
{
  const icon = E('span', { 'class': 'homeui-menu-icon' });
  const key = ICONS[name] ? name :
    (name.includes('passwall') || name.includes('wireguard') ? 'vpn' :
      'default');

  icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    ICONS[key] + '</svg>';
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

      if (node)
        this.renderMainMenu(node, url);
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
    const currentName = L.env.dispatchpath[1];
    let activeSection = null;

    sections.forEach((section, index) => {
      const active = currentName ? section.name === currentName : index === 0;
      const itemUrl = L.url(url, section.name);
      const icon = createIcon(section.name);
      const link = E('a', {
        'href': itemUrl,
        'title': _(section.title),
        'aria-label': _(section.title)
      }, [icon, E('span', {}, [_(section.title)])]);

      if (section.name === 'logout' || /logout|退出/i.test(section.title)) {
        link.classList.add('homeui-logout-link');
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

    if (!activeSection)
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
  }
});
