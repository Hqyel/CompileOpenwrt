include $(TOPDIR)/rules.mk

PKG_NAME:=luci-theme-homeui
PKG_VERSION:=1.0.0
PKG_RELEASE:=13
PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=HomeWrt

include $(INCLUDE_DIR)/package.mk

ifeq ($(HOMEUI_PACKAGE_ONLY),1)
  HOMEUI_DEPENDS:=
  HOMEUI_EXTRA_DEPENDS:=luci-base (>=0), luci-theme-bootstrap (>=0)
else
  HOMEUI_DEPENDS:=+luci-base +luci-theme-bootstrap
  HOMEUI_EXTRA_DEPENDS:=
endif

define Package/luci-theme-homeui
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=4. Themes
  TITLE:=HomeUI Theme
  DEPENDS:=$(HOMEUI_DEPENDS)
  EXTRA_DEPENDS:=$(HOMEUI_EXTRA_DEPENDS)
  PKGARCH:=all
endef

define Package/luci-theme-homeui/description
  A modern LuCI theme inspired by the iKuai management interface.
endef

define Build/Compile
endef

define Package/luci-theme-homeui/install
	$(INSTALL_DIR) $(1)/www
	$(CP) ./htdocs/* $(1)/www/
	$(INSTALL_DIR) $(1)/usr/share/ucode/luci
	$(CP) ./ucode/* $(1)/usr/share/ucode/luci/
	$(CP) ./root/* $(1)/
	$(SED) 's/@HOMEUI_VERSION@/$(PKG_VERSION)-r$(PKG_RELEASE)/g' \
		$(1)/usr/share/ucode/luci/template/themes/homeui/header.ut \
		$(1)/usr/share/ucode/luci/template/themes/homeui/footer.ut
endef

define Package/luci-theme-homeui/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
  rm -f /tmp/luci-indexcache.*
  rm -rf /tmp/luci-modulecache/
  /etc/init.d/rpcd reload 2>/dev/null
  exit 0
}
endef

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

$(eval $(call BuildPackage,luci-theme-homeui))
