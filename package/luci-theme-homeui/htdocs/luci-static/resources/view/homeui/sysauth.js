'use strict';
'require ui';
'require view';

return view.extend({
  render()
  {
    const form = document.querySelector('form');
    const button = document.querySelector('button.cbi-button-positive');
    const dialog = ui.showModal(
      _('Welcome back'),
      Array.from(document.querySelectorAll('section > *')),
      'login'
    );

    form.addEventListener('keypress', (event) => {
      if (event.key === 'Enter')
        button.click();
    });

    button.addEventListener('click', () => {
      dialog.querySelectorAll('*').forEach((node) => {
        node.style.display = 'none';
      });
      dialog.appendChild(E('div', {
        class: 'spinning'
      }, _('Logging in…')));
      form.submit();
    });

    document.querySelector('input[type="password"]').focus();
    return '';
  },

  addFooter()
  {
  }
});
