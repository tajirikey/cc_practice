# Photo Alignment - 写真位置合わせアプリ

同じ構図で写真を撮ることをサポートするWebアプリケーションです。過去に撮った写真をオーバーレイ表示して、同じアングル・ポジションで新しい写真を撮影できます。

## 主な機能

- 📸 **カメラ撮影** - ブラウザのカメラAPIを使用
- 🎯 **オーバーレイ表示** - 参照写真を半透明で重ねて表示
- 🔄 **透明度調整** - スライダーで見やすさを調整
- 💾 **写真保存** - IndexedDBでブラウザに保存
- 📱 **モバイル対応** - iOS Safari、Android Chrome対応

## ユースケース

- 子供の成長記録（同じ場所で定期的に撮影）
- ビフォーアフター写真
- 定点観測
- 再現写真の作成

## 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (Vanilla)
- **API**: MediaDevices API, Canvas API, IndexedDB
- **デプロイ**: Vercel
- **ビルド**: 不要（純粋な静的サイト）

## ローカル開発

### 方法1: Python HTTPサーバー

```bash
npm run dev
# または
python3 -m http.server 8000 --directory public
```

http://localhost:8000 にアクセス

### 方法2: Node.js HTTPサーバー

```bash
npx http-server public -p 8000
```

## Vercelへのデプロイ

### 方法1: Git連携（推奨）

1. GitHubにリポジトリをプッシュ
2. [Vercel](https://vercel.com)にログイン
3. "Import Project" → GitHubリポジトリを選択
4. プロジェクト設定:
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: （空欄）
   - Output Directory: `public`
5. Deploy

以降、`git push`で自動デプロイされます。

### 方法2: Vercel CLI

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod
```

## 使い方

1. **新しい写真を撮る**
   - 「新しい写真を撮る」ボタンをクリック
   - カメラ権限を許可
   - 撮影ボタンで撮影

2. **参照写真を使って撮る**
   - 「参照写真を選んで撮る」ボタンをクリック
   - 参照したい写真を選択
   - オーバーレイ表示された写真に合わせて位置調整
   - 透明度スライダーで見やすさを調整
   - 撮影ボタンで撮影

3. **写真の管理**
   - ホーム画面に保存した写真が一覧表示
   - 「参照に使う」ボタンで参照写真として使用
   - 「削除」ボタンで削除

## ブラウザ対応

- ✅ Chrome 90+ (デスクトップ・モバイル)
- ✅ Safari 14+ (iOS 14+)
- ✅ Edge 90+
- ✅ Firefox 88+

**重要**: カメラAPIはHTTPS環境が必要です（localhost除く）

## プロジェクト構造

```
cc_practice/
├── public/                   # 静的ファイル（デプロイ対象）
│   ├── index.html           # メインHTML
│   ├── css/
│   │   └── style.css        # スタイルシート
│   ├── js/
│   │   ├── app.js           # メインアプリケーションロジック
│   │   ├── camera-handler.js    # カメラ制御
│   │   ├── overlay-renderer.js  # オーバーレイ表示
│   │   └── storage-manager.js   # IndexedDB管理
│   └── assets/
│       └── icons/           # アイコン（オプション）
├── vercel.json              # Vercel設定
├── package.json             # プロジェクト設定
├── .gitignore               # Git除外設定
└── README.md                # このファイル
```

## セキュリティとプライバシー

- すべての写真はブラウザのIndexedDBにローカル保存
- サーバーへの送信なし
- カメラアクセスはユーザーの明示的な許可が必要
- HTTPS通信で保護（Vercel自動対応）

## トラブルシューティング

### カメラが起動しない

- HTTPS環境で実行されているか確認
- ブラウザのカメラ権限設定を確認
- 他のアプリがカメラを使用していないか確認

### モバイルで動作しない

- iOS SafariまたはAndroid Chromeを使用
- ブラウザが最新バージョンか確認
- プライベートブラウジングモードを無効化

### 写真が保存されない

- ブラウザのストレージ容量を確認
- IndexedDBが有効か確認（一部のプライバシーモードで無効）

## 今後の拡張予定

- [ ] PWA対応（オフライン動作、ホーム画面追加）
- [ ] 写真のグループ化機能
- [ ] クラウド同期オプション
- [ ] グリッド表示でのアライメント補助
- [ ] 写真編集機能（トリミング、回転）
- [ ] エクスポート機能（ZIP、共有）

## ライセンス

MIT

## 作成者

Claude + User
