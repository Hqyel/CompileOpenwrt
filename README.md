# HomeWrt x86_64

这是为以下网络结构准备的精简 OpenWrt 构建：

- PVE 8 上的 x86_64 虚拟机，宿主机为 Intel N5105。
- iKuai `10.10.10.1` 是主路由、IPv4 DHCP 和 IPv6 RA/DHCPv6 服务端。
- OpenWrt `10.10.10.2` 是单臂旁路由、PassWall、Docker 和 WireGuard
  服务端。
- 客户端只有在需要经过 OpenWrt 时，才手动把网关和 DNS 指向
  `10.10.10.2`。

## 构建基础

- 源码：ImmortalWrt `openwrt-25.12` 维护分支。
- 目标：`x86/64 generic`。
- 输出：EFI、传统 BIOS、ext4、squashfs、QCOW2 和 VMDK 镜像。
- 根分区：4 GiB，可在 PVE 中继续扩容。
- UU 加速器：固定到 `fengqi/luci-app-uugamebooster` 的
  `1065ef4ee242dc1b8abfc724b1bb3b7997ac5a1f` 提交（v14.0.6，原生
  x86_64）。

GitHub Actions 会记录完整 `.config`、源码提交、包清单和 SHA-256，构建
完成后可从 Actions Artifact 或 Release 下载。

## 内置功能

- PassWall：Xray、Sing-box、Shadowsocks Rust 客户端、Haproxy 和 Geoview。
- Docker：Docker Engine、Dockerman 和 Compose 依赖。
- 网易 UU 游戏加速器（x86_64）。
- KMS：`vlmcsd` 和 LuCI 页面；服务默认关闭，仅限合法批量许可环境使用。
- WireGuard、Cloudflare DDNS 和 DDNS-Go。
- Argon、Material、Bootstrap/Bootstrap Dark/Bootstrap Light 主题。
- PVE QEMU Guest Agent、磁盘扩容工具、TTyd、Watchcat、网络唤醒和常用诊断
  工具。

为了减少 DNS、防火墙和透明代理冲突，固件不包含 OpenClash、SSR Plus、
HomeProxy、AdGuard Home、MosDNS、MWAN3 和 UPnP。

## 首次构建

1. 打开 GitHub 仓库的 **Actions** 页面。
2. 选择 **Build custom OpenWrt x86_64**。
3. 点击 **Run workflow**，保持 `openwrt-25.12` 和发布 Release 为启用。
4. 构建完成后，下载 `.qcow2` 或 `combined-efi-ext4.img.gz`。

详细安装与迁移步骤见 [PVE 安装说明](docs/PVE_INSTALL.md)。

## 安全说明

固件不内置密码、WireGuard 私钥、Cloudflare Token 或代理订阅。首次启动后
必须立即设置 root 密码。不要把上述密钥提交到公开仓库。


