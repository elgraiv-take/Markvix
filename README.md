# Markvix (マークヴィクス) 🌲🔍

**Markvix** は、ローカルフォルダ内の Markdown ファイルをツリー表示し、プレビューしながら快適に閲覧するための **Electron 製デスクトップアプリケーション** です。
本アプリケーションは、AI 開発支援ツールである **Cursor** および **Codex** を活用して開発されています。
`markvix/` 以下が Electron + React + TypeScript によるメインのソースコードです。

---

## ✨ Features

- **Folder Tree**: 任意のルートフォルダ配下の Markdown をツリー表示。
- **Preview Panel**: 選択した Markdown をその場でプレビュー。

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Electron |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Frontend UI** | [React](https://reactjs.org/) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (推奨: LTS)
- npm

### 開発モードで起動する

1. 依存関係のインストール
   ```bash
   cd markvix
   npm install
   ```

2. 開発サーバー + Electron 起動
   ```bash
   npm run dev
   ```

または、Windows ではリポジトリ直下から以下のバッチでも実行できます。

```bash
run_markvix_electron_dev.bat
```

### ビルド & 配布用バイナリ作成

Electron Builder によるビルドスクリプトは `markvix/` 配下に定義されています。

```bash
cd markvix
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

リポジトリ直下の `build_markvix_bin.bat` を使うと、Windows 用インストーラ等を `.bin/` 配下にまとめて出力できます。

---

## 📂 Project Structure

- `markvix/` : Electron アプリ本体。
  - `src/main/` : Electron Main プロセス。
  - `src/preload/` : Preload スクリプト。
  - `src/renderer/` : フロントエンド（React）。
- `markvix_sample_docs/` : 動作確認用の Markdown ドキュメント群。
- `.bin/` : ビルド済みバイナリ・インストーラの出力先。

