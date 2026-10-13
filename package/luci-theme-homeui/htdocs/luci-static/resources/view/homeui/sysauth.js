'use strict';
'require view';

return view.extend({
  render()
  {
    const language = document.documentElement.lang.toLowerCase();
    const isChinese = language.startsWith('zh');
    const source = document.querySelector('section');
    const form = document.querySelector('form');
    const button = document.querySelector('button.cbi-button-positive');
    const brand = document.querySelector('.homeui-login-brand');
    const alert = source.querySelector('.alert-message');
    const title = isChinese ? '欢迎回来' : 'Welcome back';
    const subtitle = isChinese ?
      '登录 HomeWrt 路由管理后台' :
      'Sign in to manage your HomeWrt router';
    const featureTitle = isChinese ?
      '一个更清晰的网络管理界面' :
      'A clearer way to manage your network';
    const featureText = isChinese ?
      '集中查看系统状态、网络服务与设备运行情况。' :
      'Keep system status, network services and devices in one place.';

    document.body.classList.add('homeui-login-page');
    button.type = 'submit';
    button.classList.add('homeui-login-submit');
    form.appendChild(button);

    form.addEventListener('submit', () => {
      button.disabled = true;
      button.textContent = _('Logging in…');
    });

    document.querySelector('input[type="password"]').focus();

    return E('main', { 'class': 'homeui-login-shell' }, [
      E('aside', { 'class': 'homeui-login-aside' }, [
        brand,
        E('div', { 'class': 'homeui-login-intro' }, [
          E('span', { 'class': 'homeui-login-kicker' }, ['HomeWrt']),
          E('h1', {}, [featureTitle]),
          E('p', {}, [featureText])
        ]),
        E('div', {
          'class': 'homeui-login-network',
          'aria-hidden': 'true'
        }, [
          E('span', { 'class': 'homeui-network-core' }),
          E('span', { 'class': 'homeui-network-node node-one' }),
          E('span', { 'class': 'homeui-network-node node-two' }),
          E('span', { 'class': 'homeui-network-node node-three' })
        ])
      ]),
      E('section', { 'class': 'homeui-login-card' }, [
        E('div', { 'class': 'homeui-login-heading' }, [
          E('span', { 'class': 'homeui-login-eyebrow' }, ['HomeUI']),
          E('h2', {}, [title]),
          E('p', {}, [subtitle])
        ]),
        alert || E([]),
        form
      ])
    ]);
  },

  addFooter()
  {
  }
});
