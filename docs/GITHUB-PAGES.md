# 将灰烬回廊发布到 GitHub Pages

项目已经配置自动发布：上传到 main 或 master 分支后，GitHub Actions 安装依赖、检查类型、构建游戏，再将 dist 发布为网页。Vite 使用相对资源路径，支持仓库子目录地址。

## 首次发布

1. 将 ash-corridor 上传为 GitHub 仓库。仓库首页应直接看到 package.json、pnpm-lock.yaml、src、public 和 .github，不能再套一层 ash-corridor 文件夹。使用 GitHub Desktop 上传即可，隐藏的 .github 文件夹也会被提交。
2. 进入 GitHub 仓库的 Settings → Pages，在 Build and deployment 下将 Source 设为 GitHub Actions。免费账户请使用公开仓库；私有仓库 Pages 需要支持该功能的付费套餐。
3. 在 GitHub Desktop 提交并推送本次新增文件。如果已经推送，再到仓库 Actions → Deploy game to GitHub Pages → Run workflow，选择 main 或 master 分支并运行。
4. 等待 build、deploy 两项显示绿色。回到 Settings → Pages，点击 Visit site。通常地址为 https://你的用户名.github.io/仓库名/ 。

部署只上传构建后的游戏网页和 public 素材，不需要手动提交 dist 或 node_modules。每次向 main 或 master 推送更新都会重新发布。若使用其他默认分支，需要修改 .github/workflows/pages.yml 的 branches 列表。

## 更新与排查

- 更新：在 GitHub Desktop 中 Commit，再 Push origin，等待 Actions 完成后刷新网页。
- 构建失败：在 Actions 中打开失败的步骤查看错误；本地先运行 pnpm install --frozen-lockfile 和 pnpm build。
- 部署失败：确认 Settings → Pages → Source 为 GitHub Actions，且仓库允许运行 Actions。
- 打开后仍是旧版本：等待部署完成，然后强制刷新浏览器。

存档保存在玩家自己的浏览器中，不会通过 GitHub 同步；更换域名、设备或浏览器后不会自动迁移。网站发布后仍可通过“开始游戏.cmd”在本地游玩。

官方说明：[使用自定义工作流部署 Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
