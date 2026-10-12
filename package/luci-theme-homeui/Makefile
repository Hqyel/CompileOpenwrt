include $(TOPDIR)/rules.mk

LUCI_TITLE:=HomeUI Theme
LUCI_DEPENDS:=+luci-base +luci-theme-bootstrap
LUCI_MINIFY_CSS:=0

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=HomeWrt

define Package/luci-theme-homeui/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
  active_theme="$$(uci -q get luci.main.mediaurlbase)"

  if [ "$$active_theme" = "/luci-static/homeui" ]; then
    uci set luci.main.mediaurlbase='/luci-static/bootstrap'
  fi

  uci -q delete luci.themes.HomeUI
  uci commit luci
}
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
