# template_nodejs_repository

## 含まれる機能

- ESLint / Prettier / jest など、基本的な TypeScript 開発環境
- 本番環境用 Docker image をビルドするための　 Dockerfile
- PR 時に実行される Lint / Test を行う CI パイプライン
- CI パイプライン中で AKS Kubernetes Cluster に PR デプロイができるジョブテンプレート

## 開発を始める前に

### 動作環境

- Node.js v16
- Yarn v1.22.17

### 前提

- Volta がインストールされている

Node.js のバージョン固定のため、Volta の導入をおすすめします。

- VS Code の拡張を設定する

開発環境には Visual Studio Code (VSCode) をおすすめします。

本リポジトリには VSCode 向け推奨プラグインが定義されており、以下の手順でインストールできます。
[Managing Extensions in Visual Studio Code](https://code.visualstudio.com/docs/editor/extension-marketplace#_workspace-recommended-extensions)

### 開発を始める

```
$ git clone git@github.com:wevnal/<YOUR_REPOSITORY>.git
$ cd <YOUR_REPOSITORY>
$ yarn install
$ code .
```
