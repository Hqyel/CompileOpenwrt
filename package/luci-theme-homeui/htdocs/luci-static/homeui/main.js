(function(window) {
  'use strict';

  var HomeUI = window.HomeUI;
  var root = HomeUI.root;
  var collapseButton = HomeUI.collapseButton;
  var colorButton = HomeUI.colorButton;
  var topMenu = HomeUI.topMenu;
  var indicators = HomeUI.indicators;
  var searchTrigger = HomeUI.searchTrigger;
  var darkQuery = HomeUI.darkQuery;
  var resolveCurrentPageId = HomeUI.resolveCurrentPageId;
  var isOverview = HomeUI.isOverview;
  var isRoutesPage = HomeUI.isRoutesPage;
  var isFirewallStatusPage = HomeUI.isFirewallStatusPage;
  var isRealtimePage = HomeUI.isRealtimePage;
  var isWireguardPage = HomeUI.isWireguardPage;
  var isSystemPage = HomeUI.isSystemPage;
  var isLogsPage = HomeUI.isLogsPage;
  var isProcessesPage = HomeUI.isProcessesPage;
  var isNetworkPage = HomeUI.isNetworkPage;
  var applyColorMode = HomeUI.applyColorMode;
  var toggleSidebar = HomeUI.toggleSidebar;
  var expandSidebarOnMenuClick = HomeUI.expandSidebarOnMenuClick;
  var labelIndicators = HomeUI.labelIndicators;
  var openSearchModal = HomeUI.openSearchModal;
  var pollLiveRouterStats = HomeUI.pollLiveRouterStats;
  var pollLiveMemory = HomeUI.pollLiveMemory;
  var pollLiveThroughput = HomeUI.pollLiveThroughput;
  var getOverviewSectionName = HomeUI.getOverviewSectionName;
  var createIkuaiDashboard = HomeUI.createIkuaiDashboard;
  var updateOverviewDashboard = HomeUI.updateOverviewDashboard;
  var enhanceRoutesPage = HomeUI.enhanceRoutesPage;
  var enhanceFirewallStatusPage = HomeUI.enhanceFirewallStatusPage;
  var enhanceRealtimePage = HomeUI.enhanceRealtimePage;
  var enhanceWireguardPage = HomeUI.enhanceWireguardPage;
  var enhanceSystemSettingsPage = HomeUI.enhanceSystemSettingsPage;
  var enhanceLogsPage = HomeUI.enhanceLogsPage;
  var enhanceProcessesPage = HomeUI.enhanceProcessesPage;
  var enhanceNetworkInterfacesPage = HomeUI.enhanceNetworkInterfacesPage;
  var isEnhancing = false;

  function enhanceOverview()
  {
    var page = resolveCurrentPageId();
    if (isEnhancing)
      return;

    var view = document.querySelector('#view') ||
      document.querySelector('#maincontent');
    if (!view)
      return;

    if (page === 'admin-status-routes') {
      isEnhancing = true;
      try {
        enhanceRoutesPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page === 'admin-status-nftables' || page === 'admin-status-iptables') {
      isEnhancing = true;
      try {
        enhanceFirewallStatusPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (/^admin-status-realtime/.test(page)) {
      isEnhancing = true;
      try {
        enhanceRealtimePage(view, page);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page === 'admin-status-wireguard') {
      isEnhancing = true;
      try {
        enhanceWireguardPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page === 'admin-system-system') {
      isEnhancing = true;
      try {
        enhanceSystemSettingsPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (/^admin-status-(?:logs|syslog|dmesg)/.test(page)) {
      isEnhancing = true;
      try {
        enhanceLogsPage(view, page);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page === 'admin-status-processes') {
      isEnhancing = true;
      try {
        enhanceProcessesPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page === 'admin-network-network') {
      isEnhancing = true;
      try {
        enhanceNetworkInterfacesPage(view);
      } finally {
        isEnhancing = false;
      }
      return;
    }

    if (page !== 'admin-status-overview')
      return;

    isEnhancing = true;
    try {
      var names = [
        'system',
        'memory',
        'storage',
        'ports',
        'network',
        'dhcp',
        'dhcp6',
        'wifi'
      ];
      var allSections = view.querySelectorAll('.cbi-section');
      var sectionMap = {};

      if (!view.querySelector('.homeui-ikuai-dashboard'))
        createIkuaiDashboard(view);

      Array.prototype.forEach.call(allSections, function(section, index) {
        if (section.closest('.homeui-ikuai-dashboard'))
          return;
        var name = getOverviewSectionName(section, names[index]);
        section.classList.add('homeui-overview-card');
        if (name) {
          section.classList.add('homeui-overview-' + name);
          if (!sectionMap[name])
            sectionMap[name] = section;
        }
      });

      updateOverviewDashboard(view, sectionMap);
    } finally {
      isEnhancing = false;
    }
  }

  if (collapseButton)
    collapseButton.addEventListener('click', toggleSidebar);

  if (topMenu)
    topMenu.addEventListener('click', expandSidebarOnMenuClick);

  if (searchTrigger)
    searchTrigger.addEventListener('click', openSearchModal);

  document.addEventListener('keydown', function(ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      openSearchModal();
    }
  });

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

  new MutationObserver(function(mutations) {
    var shouldUpdate = mutations.some(function(m) {
      return !m.target.closest ||
        (!m.target.closest('.homeui-ikuai-dashboard') &&
         !m.target.closest('.homeui-subpage-shell') &&
         !m.target.closest('.homeui-rt-card-head') &&
         !m.target.closest('.homeui-log-card-head') &&
         !m.target.closest('.homeui-proc-card-head') &&
         !m.target.classList.contains('homeui-sec-count') &&
         !m.target.classList.contains('homeui-sec-cat'));
    });
    if (shouldUpdate)
      enhanceOverview();
  }).observe(
    document.querySelector('#maincontent') || document.body,
    { childList: true, subtree: true, characterData: true }
  );

  if (isOverview) {
    pollLiveRouterStats(function() {
      enhanceOverview();
      pollLiveThroughput(enhanceOverview);
    });
    pollLiveMemory(enhanceOverview);
    setInterval(function() {
      if (!document.hidden)
        pollLiveThroughput(enhanceOverview);
    }, 3000);
    setInterval(function() {
      if (!document.hidden)
        pollLiveMemory(enhanceOverview);
    }, 5000);
    setInterval(function() {
      if (!document.hidden)
        pollLiveRouterStats(enhanceOverview);
    }, 15000);
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        pollLiveRouterStats(enhanceOverview);
        pollLiveMemory(enhanceOverview);
        pollLiveThroughput(enhanceOverview);
      }
    });
  } else if (isRoutesPage || isFirewallStatusPage || isRealtimePage ||
             isWireguardPage || isSystemPage || isLogsPage || isProcessesPage ||
             isNetworkPage) {
    setInterval(enhanceOverview, 1000);
  }

  window.addEventListener('load', enhanceOverview);
  applyColorMode(root.dataset.colorMode || 'auto');
  labelIndicators();
  enhanceOverview();
})(window);
