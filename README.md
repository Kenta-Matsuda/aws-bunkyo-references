# AWS × 文教 公式リソース索引

学校、大学、研究機関の仕事に関わる AWS 公式のブログ記事と資料の索引です。

公開ページ: https://kenta-matsuda.github.io/aws-bunkyo-references/

- **厳選 100**: AWS エンジニアにとって技術的に学びが多く(Level 200〜400)、教育の仕事に結びつきの強い 100 件。1 件ごとに「学べること」と「あらすじ」を付けています。
- **読む順**: テーマ別の章立て。
- **全件索引**: 2,834 件を語句・出典・年・カテゴリ・種類で絞り込めます。Markdown や TSV でコピーできます。

AWS が公開しているページを 2026 年 9〜10 月に集めた非公式の索引です。タイトルは原文のままで、元のページにリンクしています。公開後にサービス名が変わったり、提供が終わったりしたものがあります。

## ファイル構成

外部への読み込みは Google Fonts のみです。

| パス | 中身 |
| --- | --- |
| `index.html` | ページの骨組み |
| `assets/style.css` | 見た目 |
| `assets/app.js` | 絞り込み・検索・描画などの動き |
| `data/catalog.json` | 全件索引。`kinds` / `status` は資料の種類と確認区分の名前(この順で選択肢に並ぶ)、`rows` は 1 行 1 件 |
| `data/order.json` | 読む順の章立て。`picks` / `rest` / `extras` は `catalog.json` の記事を URL で指す |
| `data/picks.json` | 厳選 100 |

### `rows` の 1 件

ブログ記事:

```json
{"src":"en","date":"2026-09-28","title":"…","url":"https://aws.amazon.com/blogs/publicsector/…/","cats":["Higher education","Generative AI"],"listing":"outside"}
```

- `src`: `en`(英語の Public Sector Blog)か `jp`(日本語の AWS ブログ)
- `cats`: ブログのカテゴリ名。カテゴリの選択肢は、ここに出てくる名前から作ります
- `mark`(日本語のみ・省略可): `★` は Education サブカテゴリ、`☆` は語句から教育・研究と判断したもの
- `listing`(省略可): `gap` はカテゴリはあるが一覧のページ送りに出てこなかったもの、`outside` はカテゴリ外(画面では ＋)。省略するとカテゴリ一覧に出てきた記事

そのほかの資料:

```json
{"src":"other","date":"2025-06","title":"…","url":"https://…","kind":"導入事例","status":"開いて確認","note":"…","lang":"ja"}
```

- `date`: `YYYY-MM-DD`、`YYYY`、または空(日付なし)
- `kind` / `status`: `kinds` / `status` にある名前。無い名前を使うとコンソールに警告が出ます
- `note`(省略可): メモ。`lang`: タイトルの言語

URL は全件で重複しないようにします。`order.json` で指した URL が `rows` に無いときは、その記事を飛ばしてコンソールに警告を出します。

### 件数の表示

ページ内の件数や日付の範囲のうち、データから数えられるものは `<span data-stat="en.total">1,210</span>` のように書き、表示のときに `assets/app.js` が数え直した値に置き換えます。HTML に書いてある数字は、スクリプトが動かないときに出る仮の値です。集め方の説明にある数字(一覧のページ数など)はデータから数えられないため、手で直してください。

データは `fetch` で読み込むため、`index.html` をファイルとして直接開いても表示されません。手元で見るときは、リポジトリの直下で `python -m http.server` を実行し、http://localhost:8000/ を開いてください。
