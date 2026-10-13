(function() {
  'use strict';

  var root = document.documentElement;
  var collapseButton = document.querySelector('#homeui-collapse');
  var colorButton = document.querySelector('#homeui-color-toggle');
  var colorLabel = document.querySelector('.homeui-color-label');
  var topMenu = document.querySelector('#topmenu');
  var indicators = document.querySelector('#indicators');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyColorMode(mode)
  {
    var isDark = mode === 'dark' ||
      (mode === 'auto' && darkQuery.matches);
    var labels = {
      auto: 'Auto',
      light: 'Light',
      dark: 'Dark'
    };

    root.dataset.colorMode = mode;
    root.dataset.darkmode = isDark ? 'true' : 'false';
    localStorage.setItem('homeui-color-mode', mode);

    if (colorLabel) {
      colorLabel.textContent = labels[mode];
      colorButton.title = labels[mode];
    }
  }

  function setSidebarCollapsed(collapsed)
  {
    root.classList.toggle('homeui-collapsed', collapsed);
    localStorage.setItem(
      'homeui-sidebar',
      collapsed ? 'collapsed' : 'expanded'
    );
  }

  function toggleSidebar()
  {
    if (window.matchMedia('(max-width: 900px)').matches) {
      root.classList.toggle('homeui-mobile-panel-open');
      return;
    }

    setSidebarCollapsed(!root.classList.contains('homeui-collapsed'));
  }

  function expandSidebarOnMenuClick(event)
  {
    if (!event.target.closest('a'))
      return;

    if (window.matchMedia('(max-width: 900px)').matches)
      return;

    if (root.classList.contains('homeui-collapsed'))
      setSidebarCollapsed(false);
  }

  function labelIndicators()
  {
    if (!indicators)
      return;

    Array.prototype.forEach.call(indicators.children, function(item) {
      var label = item.textContent.trim();

      if (label && !item.title)
        item.title = label;
    });
  }

  function enhanceOverview()
  {
    var page = document.body.dataset.page || '';

    if (page !== 'admin-status-overview')
      return;

    var view = document.querySelector('#view');

    if (!view)
      return;

    var names = [
      'system',
      'memory',
      'storage',
      'ports',
      'network',
      'dhcp',
      'dsl',
      'wifi'
    ];
    var sections = view.querySelectorAll(':scope > .cbi-section');

    view.classList.add('homeui-overview-grid');

    Array.prototype.forEach.call(sections, function(section, index) {
      section.classList.add('homeui-overview-card');

      if (names[index])
        section.classList.add('homeui-overview-' + names[index]);
    });
  }

  if (collapseButton)
    collapseButton.addEventListener('click', toggleSidebar);

  if (topMenu)
    topMenu.addEventListener('click', expandSidebarOnMenuClick);

  if (colorButton) {
    colorButton.addEventListener('click', function() {
      var current = root.dataset.colorMode || 'auto';
      var next = current === 'auto' ? 'light' :
        (current === 'light' ? 'dark' : 'auto');
      applyColorMode(next);
    });
  }

  darkQuery.addEventListener('change', function() {
    if ((root.dataset.colorMode || 'auto') === 'auto')
      applyColorMode('auto');
  });

  if (indicators) {
    new MutationObserver(labelIndicators).observe(indicators, {
      childList: true,
      subtree: true
    });
  }

  new MutationObserver(enhanceOverview).observe(
    document.querySelector('#maincontent') || document.body,
    { childList: true, subtree: true }
  );

  applyColorMode(root.dataset.colorMode || 'auto');
  labelIndicators();
  enhanceOverview();
})();
