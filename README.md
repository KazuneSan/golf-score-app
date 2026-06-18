# Three.js Waving Character

GitHub Pages でそのまま公開できる、ビルド不要の Three.js デモです。  
`index.html` をルートに置いているので、そのまま `main` ブランチの `root` を配信先に設定できます。

## 公開手順

1. このリポジトリを GitHub に push します。
2. GitHub の対象リポジトリで `Settings` を開きます。
3. `Pages` を開きます。
4. `Build and deployment` で `Deploy from a branch` を選びます。
5. Branch を `main`、Folder を `/ (root)` に設定して保存します。
6. 数分待つと GitHub Pages で公開されます。

## 公開 URL

通常は以下の形式になります。

`https://<your-github-user>.github.io/<repository-name>/`

例:

`https://example.github.io/threejs-waving-character/`

## ローカルで確認する方法

`type="module"` で CDN を読み込んでいるため、ローカル確認は簡易サーバー経由を推奨します。

```bash
python3 -m http.server 8000
```

その後、ブラウザで以下を開きます。

`http://localhost:8000/`

## 操作方法

- ドラッグ: キャラクターを少し回転
- ピンチ: ズーム

## 実装内容

- Three.js を CDN から `type="module"` で読み込み
- プリミティブだけで、丸い頭身のかわいいキャラクターを構成
- 右腕を `Object3D` の pivot で回転させて手振りアニメーションを実装
- 影、芝生風の地面、淡いクリーム色の背景を追加
- iPhone / PC 向けに軽量化し、`resize` と `devicePixelRatio` 上限設定に対応
