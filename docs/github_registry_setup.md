# GitHub Container Registry 推送方案

## 当前状态
- ✅ MyWind Docker镜像构建成功
- ⏸️ 推送到ghcr.io需要认证

## 两种方案

### 方案1: 手动推送（需要PAT）

**步骤**:
1. 获取GitHub Personal Access Token
   - 访问: https://github.com/settings/tokens
   - 创建新token (Classic)
   - 勾选: `write:packages`, `read:packages`
   
2. 登录ghcr.io
   ```bash
   echo YOUR_TOKEN | docker login ghcr.io -u 1williamaoayers --password-stdin
   ```

3. 推送镜像
   ```bash
   docker push ghcr.io/1williamaoayers/mywind-aktools:latest
   ```

---

### 方案2: GitHub Actions自动推送（推荐）⭐

**优势**:
- ✅ 无需手动认证
- ✅ GitHub自动提供token
- ✅ 每次代码更新自动构建
- ✅ 更安全

**需要创建的文件**:
`.github/workflows/build-mywind.yml`

**工作流程**:
1. 每次push到main分支
2. 自动构建MyWind镜像
3. 自动推送到ghcr.io/1williamaoayers/mywind-aktools

---

## 建议

**推荐使用方案2** - GitHub Actions自动化
- TradingAgents已经在用这个方式
- 更加标准和安全
- 省时省力
