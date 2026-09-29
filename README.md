# AIB-Study-App

AWS Certified AI Business Strategist（**AIB-C01**）合格対策のための問題集アプリです。
オリジナル問題を **500問** 収録し、「演習モード」と「本番試験モード」を用意しています。

## 使い方

ビルドは不要です。`index.html` をブラウザで開くだけで動きます（GitHub Pages でも公開できます）。

| モード | 内容 |
| --- | --- |
| 演習モード | ランダムに10問出題。1問ごとに正誤と解説を表示。ドメインの絞り込みや「間違えた問題のみ」も選べます。未出題の問題を優先して出題します。 |
| 本番試験モード | 85問・170分。ドメインの配点比率に沿って出題します。見直しフラグと問題一覧から移動でき、提出または時間切れで採点します。スコアは100〜1000点に換算し、700点以上で合格です。途中で中断しても再開できます。 |

学習履歴と間違えた問題はブラウザ（localStorage）に保存されます。

## 収録問題

| ドメイン | 配点比率 | 問題数 |
| --- | --- | --- |
| D1 AIの基礎とリテラシー | 24% | 138 |
| D2 AI戦略とビジネス価値の創出 | 28% | 132 |
| D3 AIガバナンスと責任あるAIのリーダーシップ | 24% | 115 |
| D4 ビジネスの準備、リーダーシップ、AIトランスフォーメーション | 24% | 115 |

- 択一問題（4択）と複数選択問題（66問）を収録しています。
- 選択肢は出題のたびにシャッフルされます。
- 問題はすべて公開情報をもとにしたオリジナル問題で、実際の試験問題ではありません。

## 学習に役立つ公式資料・ホワイトペーパー

- [AIB-C01 試験ガイド](https://docs.aws.amazon.com/ja_jp/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html)
  - 「Technologies and concepts」「In-scope AWS services」のページも確認してください。
- [AWS Cloud Adoption Framework for AI, ML, and Generative AI（ホワイトペーパー）](https://docs.aws.amazon.com/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.html)
  - 6つのパースペクティブと、Envision / Align / Launch / Scale のフェーズ
- AWS Well-Architected Framework の [Responsible AI Lens](https://aws.amazon.com/ai/responsible-ai/) / [Generative AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html)
- [AWS 責任共有モデル](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [Amazon Bedrock ユーザーガイド](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html)
  - Guardrails、Knowledge Bases、Agents、料金
- [Amazon SageMaker AI](https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html)、[Amazon Quick](https://aws.amazon.com/quick/)
- AWS Skill Builder の「Exam Prep Plan: AWS Certified AI Business Strategist (AIB-C01)」

## ファイル構成

```
index.html        画面
css/style.css     スタイル（ライト/ダーク対応、スマホ対応）
js/app.js         出題・採点・タイマー・記録
data/meta.js      試験設定（問題数・時間・合格点）、ドメイン、参考資料
data/q-d1.js      D1 の問題（q-d2〜q-d4 も同様）
```

本番試験モードの問題数や試験時間は `data/meta.js` の `exam` で変更できます。

## GitHub Pages での公開

1. このリポジトリの **Settings → Pages** を開く
2. **Source** で「Deploy from a branch」を選び、Branch を `main`、フォルダを `/ (root)` にして **Save**
3. 数分後に `https://masakiokuda-eng.github.io/AIB-Study-App/` で公開されます

※ `.nojekyll` を置いているので、Jekyll の変換を行わずにそのまま配信されます。
