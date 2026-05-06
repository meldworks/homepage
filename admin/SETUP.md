# Decap CMS セットアップ手順

`https://meldworks.co.jp/admin/` で動作するコンテンツ管理画面です。
GitHub への直接コミットを行うため、初回のみ以下のセットアップが必要です。

セットアップは **1回だけ** で済みます。一度設定すれば、以降は管理画面ログインのみで記事を編集・公開できます。

---

## 全体像

Decap CMS は GitHub OAuth 経由で認証を行い、編集内容を直接リポジトリにコミットします。

```
[管理画面 /admin/]
       │
       │ ① GitHub OAuth でログイン
       ▼
[OAuth プロキシ (Cloudflare Workers)]
       │
       │ ② アクセストークン取得
       ▼
[GitHub]
       │
       │ ③ 編集内容をコミット
       ▼
[GitHub Pages にデプロイ]
```

OAuth プロキシは GitHub Pages 自身では動かせないため、
**Cloudflare Workers の無料枠** を利用するのが最も簡単です。

---

## ステップ 1：GitHub OAuth App の作成

1. GitHub の右上アイコン → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App** を開く
2. 以下のように入力：
   - **Application name**: `meldworks CMS`
   - **Homepage URL**: `https://meldworks.co.jp`
   - **Authorization callback URL**: `https://decap-oauth.meldworks.workers.dev/callback`
     （後で作成する Worker の URL に合わせてください）
3. 作成後、**Client ID** と **Client Secret** をメモしておきます

---

## ステップ 2：Cloudflare Workers の OAuth プロキシをデプロイ

Cloudflare アカウント（無料）と `wrangler` CLI が必要です。

### 2-1. Worker 作成

ローカルに作業用フォルダを作って、以下のコマンドを実行：

```bash
npm create cloudflare@latest decap-oauth
# テンプレート選択 → "Hello World" Worker
# TypeScript: No
# git init: お好み
cd decap-oauth
```

### 2-2. `src/index.js` を以下に置き換え

```javascript
// Decap CMS GitHub OAuth プロキシ (Cloudflare Workers 版)
const CLIENT_ID     = 'GITHUB_OAUTH_CLIENT_ID';      // ステップ1で取得
const CLIENT_SECRET = 'GITHUB_OAUTH_CLIENT_SECRET';  // ステップ1で取得
const SCOPE         = 'repo,user';
const ALLOWED_ORIGIN = 'https://meldworks.co.jp';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // /auth → GitHub の認可画面へリダイレクト
    if (url.pathname === '/auth') {
      const state = crypto.randomUUID();
      const redirect = new URL('https://github.com/login/oauth/authorize');
      redirect.searchParams.set('client_id', CLIENT_ID);
      redirect.searchParams.set('scope', SCOPE);
      redirect.searchParams.set('state', state);
      redirect.searchParams.set('redirect_uri', `${url.origin}/callback`);
      return Response.redirect(redirect.toString(), 302);
    }

    // /callback → アクセストークンを取得して管理画面に postMessage で返す
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return new Response('Missing code', { status: 400 });

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
      });
      const data = await tokenRes.json();

      const payload = data.access_token
        ? { token: data.access_token, provider: 'github' }
        : { error: data.error || 'unknown' };

      const html = `<!doctype html><html><body><script>
        (function() {
          function send(msg) {
            window.opener && window.opener.postMessage(
              'authorization:github:' + (${JSON.stringify(payload.error ? 'error' : 'success')}) + ':' + JSON.stringify(${JSON.stringify(payload)}),
              ${JSON.stringify(ALLOWED_ORIGIN)}
            );
          }
          window.addEventListener('message', function(e) {
            if (e.data === 'authorizing:github') send();
          }, false);
          send();
        })();
      </script></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    return new Response('Decap OAuth Proxy', { status: 200 });
  },
};
```

`CLIENT_ID` と `CLIENT_SECRET` の部分を、ステップ 1 で取得した値に置き換えてください。
（または `wrangler secret put` で安全に管理することも可能です）

### 2-3. デプロイ

```bash
npx wrangler deploy
```

デプロイ完了後に表示される URL（例：`https://decap-oauth.meldworks.workers.dev`）を控えてください。

### 2-4. GitHub OAuth App の Callback URL を更新

ステップ 1 で作った GitHub OAuth App の
**Authorization callback URL** を `https://<Worker URL>/callback` に修正します。

---

## ステップ 3：`admin/config.yml` の更新

`admin/config.yml` の `base_url` を、デプロイした Worker の URL に書き換えます：

```yaml
backend:
  name: github
  repo: meldworks/homepage
  branch: main
  base_url: https://decap-oauth.meldworks.workers.dev   # ← ここ
  auth_endpoint: auth
```

変更を main ブランチにコミット・プッシュすれば反映されます。

---

## ステップ 4：管理画面にログイン

1. ブラウザで `https://meldworks.co.jp/admin/` を開く
2. 「Login with GitHub」をクリック
3. GitHub の認可画面で許可
4. 管理画面が開けば成功

---

## 使い方

### 新規記事の作成

1. 管理画面で「お知らせ」を開く
2. 「お知らせ一覧」→ 既存リストの下にある「+ 記事を追加」
3. 必要事項を入力（ID, 公開日, カテゴリ, タイトル JP/EN, 概要 JP/EN, 本文 JP/EN, 画像）
4. 「下書き保存」 → 「公開」 → コミットされ、デプロイ後に公開されます

### 画像のアップロード

本文中で画像挿入ボタンを使うと、`/images/news/` にアップロードされます。
記事の「カバー画像」欄からも同様にアップロード可能です。

### 編集ワークフロー

`publish_mode: editorial_workflow` を有効にしているため、以下の3段階で運用できます：

- **Drafts**: 下書き
- **In Review**: レビュー待ち
- **Ready**: 公開可能

---

## トラブルシューティング

| 症状 | 確認ポイント |
|---|---|
| ログイン画面で「No auth provider」エラー | `config.yml` の `base_url` と Worker の URL が一致しているか |
| 「Failed to load entries」エラー | GitHub OAuth App の権限が `repo` を含んでいるか |
| Worker が応答しない | `wrangler tail` でログを確認 |
| 画像が表示されない | `media_folder` と `public_folder` の設定が正しいか |

---

## 参考リンク

- Decap CMS 公式ドキュメント: https://decapcms.org/docs/
- GitHub Backend: https://decapcms.org/docs/github-backend/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
