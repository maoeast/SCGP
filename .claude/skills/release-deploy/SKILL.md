---
name: release-deploy
description: SCGP Windows 新版打包 + 发布到自动更新服务器的完整流程。当用户要发布新版、打包安装包、上传到服务器、部署自动更新源、或问"怎么发版/部署新版"时使用。含 latest.yml 完整性校验,防止 latest.yml 被误写成 exe 内容导致客户端更新失败。
---

# SCGP 发布部署

把新版 Windows 安装包发布到自动更新服务器,让已安装的老用户能自动升级。

## 环境约定(单人项目固定值,环境变更时只改这里)

| 项 | 值 |
|---|---|
| SSH 私钥 | `E:/Downloads/openclaw.pem`（腾讯云密钥，登 ubuntu 用户） |
| 服务器（tailscale） | `vm-0-8-ubuntu` / `100.114.108.86` |
| SSH 用户 | `ubuntu`（免密 sudo） |
| 中转目录 | `/home/ubuntu/`（ubuntu 家，可写） |
| 目标目录 | `/home/lighthouse/scgp/win/`（root 拥有，需 sudo） |
| 主源 URL | `https://maohedong.top/scgp/win` |
| 旧源 URL | `http://124.220.104.199/scgp/win`（老 1.0.6 用户跳板） |

> 主源和旧源在服务器同一物理目录，覆盖一次两个 URL 都生效。

## 流程

命令里的 `<version>` 取 `package.json` 的 `version` 字段（如 `1.0.8`）。

### 1. 升版本号（如需）

改 `package.json` 的 `"version"`，例如 `1.0.7` → `1.0.8`。
若改了更新源 URL 或迁移逻辑，同步更新 `electron/handlers/update.js` 和契约测试 `scripts/tests/update-provider-config.test.mjs`。

### 2. 打包

```bash
npm run build:electron:win
```

产物在 `release/`：`scgp-setup-<version>.exe` + `.exe.blockmap` + `latest.yml`。签名全 skip（不签名，已知取舍）。

### 3. 本地校验产物（关键，防 latest.yml 损坏）

```bash
npm run release:verify
```

脚本校验：

- `latest.yml` 是小 yaml（< 2KB，首行 `version:`）**不是 exe 内容**
- exe 的 sha512（base64）== `latest.yml` 里的 sha512
- exe 的 size == `latest.yml` 里的 size
- `latest.yml` 的 version == `package.json` 的 version

全 PASS 才继续。FAIL 多半是 `latest.yml` 被 exe 内容覆盖——重跑打包；或按下方模板手写重建（用 exe 真实 sha512/size）。

### 4. 上传（scp via tailscale + 密钥，免密）

```bash
scp -i E:/Downloads/openclaw.pem -o IdentitiesOnly=yes \
  release/scgp-setup-<version>.exe \
  release/scgp-setup-<version>.exe.blockmap \
  release/latest.yml \
  ubuntu@100.114.108.86:/home/ubuntu/
```

约 520MB，建议后台跑（走 tailscale 直连，不经开发机公网代理，干净且快）。

### 5. 部署（sudo 移到目标 + chown/chmod）

```bash
ssh -i E:/Downloads/openclaw.pem -o IdentitiesOnly=yes ubuntu@100.114.108.86 \
  'set -e; sudo mv /home/ubuntu/scgp-setup-<version>.exe /home/ubuntu/scgp-setup-<version>.exe.blockmap /home/ubuntu/latest.yml /home/lighthouse/scgp/win/; sudo chown root:root /home/lighthouse/scgp/win/scgp-setup-<version>.exe /home/lighthouse/scgp/win/scgp-setup-<version>.exe.blockmap /home/lighthouse/scgp/win/latest.yml; sudo chmod 644 /home/lighthouse/scgp/win/scgp-setup-<version>.exe /home/lighthouse/scgp/win/scgp-setup-<version>.exe.blockmap /home/lighthouse/scgp/win/latest.yml'
```

### 6. 验证两源（必须在服务器 curl，开发机 curl 被代理污染不可信）

```bash
ssh -i E:/Downloads/openclaw.pem -o IdentitiesOnly=yes ubuntu@100.114.108.86 \
  'curl -s https://maohedong.top/scgp/win/latest.yml | head -1; curl -s http://124.220.104.199/scgp/win/latest.yml | head -1'
```

两条都输出 `version: <version>` = 部署成功。

### 7. 真机验证（人工，可选）

验收机装旧版 → 检查更新应弹新版 → 下载安装（SmartScreen 蓝屏点"更多信息 → 仍要运行"）→ 重启后查更新应"已是最新版本"。

## latest.yml 重建模板（损坏时用）

```yaml
version: <version>
files:
  - url: scgp-setup-<version>.exe
    sha512: <exe 的 sha512 base64>
    size: <exe 的 size 字节>
path: scgp-setup-<version>.exe
sha512: <exe 的 sha512 base64>
releaseDate: '<ISO 时间>'
```

exe 的 sha512 base64 算法：

```bash
sha512sum release/scgp-setup-<version>.exe | cut -d' ' -f1 | xxd -r -p | base64
```

## 踩坑库

- **latest.yml 被 exe 内容覆盖**：曾发生 `latest.yml` 变成 519.9M 的 exe 二进制（应为 ~337B yaml），客户端拿到 exe 当 yaml 解析、更新失败。`release:verify` 专门拦截。修复：按上方模板重建 latest.yml（exe 真实 sha512 base64 + size + version）。
- **开发机 curl / 外部探测不可信**：本机有代理（fake-ip）污染外部 HTTPS/DNS。验证更新源、查证书，必须在服务器或干净设备上做，不要信本机 curl/openssl/nslookup。
- **两源都要在**：HTTPS 主源 + HTTP 旧源 IP（给老 1.0.6 用户当跳板——他们本地 `update-config.json` 还是旧 http 地址，代码里 `LEGACY_UPDATE_URLS` 会自动迁移到 https）。
- **旧版 exe 不删**：目录里旧版 exe 留着无害，`latest.yml` 指向新版即可。
- **不签名**：安装触发 SmartScreen 蓝色警告，用户点"更多信息 → 仍要运行"。已知取舍，不购买 Windows 签名证书。
- **私钥配 ubuntu 不是 root**：openclaw.pem 登 `ubuntu` 用户（免密 sudo），不是 root/lighthouse。

## 相关文件

- 打包：`package.json` → `build:electron:win`、`build` 字段
- 校验：`scripts/release-verify.mjs`
- 更新源逻辑：`electron/handlers/update.js`（URL 常量 + `LEGACY_UPDATE_URLS` 旧地址迁移）
- 契约测试：`scripts/tests/update-provider-config.test.mjs`
