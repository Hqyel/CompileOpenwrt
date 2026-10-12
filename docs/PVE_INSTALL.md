# PVE 安装与迁移

## 推荐虚拟机规格

- CPU：2 vCPU，类型 `host`。
- 内存：2 GiB；Docker 容器较多时使用 4 GiB。
- 磁盘：VirtIO SCSI，8–16 GiB。
- 网卡：VirtIO，桥接到当前 `10.10.10.0/24` 所在网桥。
- BIOS：OVMF 使用 EFI 镜像；SeaBIOS 使用传统 BIOS 镜像。
- QEMU Guest Agent：启用。

## 保留现有 IPv6 后缀

iKuai ACL 和 DDNS-Go 当前依赖 OpenWrt 网卡的 EUI-64 后缀
`be24:11ff:fe7c:f661`。新虚拟机必须继续使用现有网卡 MAC
`BC:24:11:7C:F6:61`，否则必须同步修改：

1. iKuai 的 IPv6 后缀 ACL；
2. DDNS-Go 的 IPv6 正则表达式；
3. 可能缓存旧地址的 WireGuard 客户端 DNS。

同一时刻不能让新旧两台虚拟机同时使用相同 MAC 或 `10.10.10.2`。

## 推荐迁移方式

不要在现有虚拟机上直接覆盖。新建一台测试虚拟机，验证完成后再停掉旧机，
这样出现问题可以立即回滚。

1. 在旧系统备份 `/etc/config/network`、`/etc/config/firewall`、
   `/etc/config/passwall` 和 WireGuard 私钥；不要把密钥提交到 GitHub。
2. 下载并校验 `CUSTOM-SHA256SUMS`。
3. 将 QCOW2 上传到 PVE，然后导入到新虚拟机：

   ```sh
   qm importdisk <VMID> immortalwrt-*.qcow2 <STORAGE>
   ```

4. 把导入磁盘挂到 VirtIO SCSI，设置正确的启动顺序和网卡 MAC。
5. 先断开旧 OpenWrt 网卡，再启动新虚拟机。
6. 访问 `https://10.10.10.2`，立即设置 root 密码。

## 默认网络行为

- LAN：`10.10.10.2/24`，网关和 DNS 为 `10.10.10.1`。
- WAN6：在 `br-lan` 上通过 DHCPv6 获取公网 IPv6，不请求前缀。
- OpenWrt 的 IPv4 DHCP、DHCPv6、RA 和 NDP 代理均关闭。
- 防火墙允许 WAN6 入站 UDP 51820，但 WireGuard 接口、私钥和 Peer 不会被
  写入镜像。

WireGuard 恢复后，再建立 `wg0 -> lan` 转发及 `10.66.66.0/24` 到
`10.10.10.0/24` 的 SNAT。先确认手机能握手和访问内网，再迁移 DDNS。

## Docker 磁盘

镜像根分区为 4 GiB。PVE 磁盘扩容后，可以使用固件内置的 `parted` 和
`resize2fs` 扩大 ext4 根分区。生产 Docker 数据较多时，更稳妥的做法是挂载
独立 VirtIO 数据盘到 `/opt/docker`，避免容器日志写满系统分区。


