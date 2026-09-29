// 試験メタ情報と問題登録ヘルパー
window.AIB = {
  exam: {
    questions: 85,      // 本番試験モードの出題数
    minutes: 170,       // 制限時間（分）
    passScore: 700,     // 合格スコア（100〜1000）
    practiceSize: 10    // 演習モードの出題数
  },
  domains: {
    1: { name: "AIの基礎とリテラシー", short: "D1 基礎", weight: 24 },
    2: { name: "AI戦略とビジネス価値の創出", short: "D2 戦略", weight: 28 },
    3: { name: "AIガバナンスと責任あるAIのリーダーシップ", short: "D3 ガバナンス", weight: 24 },
    4: { name: "ビジネスの準備、リーダーシップ、AIトランスフォーメーション", short: "D4 変革", weight: 24 }
  },
  refs: {
    GUIDE: { title: "AIB-C01 試験ガイド", url: "https://docs.aws.amazon.com/ja_jp/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html" },
    CAF: { title: "AWS Cloud Adoption Framework for AI, ML, and Generative AI（ホワイトペーパー）", url: "https://docs.aws.amazon.com/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.html" },
    RAI: { title: "Well-Architected Responsible AI Lens / AWS 責任あるAI", url: "https://aws.amazon.com/ai/responsible-ai/" },
    GENAI: { title: "Well-Architected Generative AI Lens", url: "https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/generative-ai-lens.html" },
    SRM: { title: "AWS 責任共有モデル", url: "https://aws.amazon.com/compliance/shared-responsibility-model/" },
    BEDROCK: { title: "Amazon Bedrock ユーザーガイド", url: "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html" },
    SAGEMAKER: { title: "Amazon SageMaker AI 開発者ガイド", url: "https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html" },
    QUICK: { title: "Amazon Quick / Amazon Q", url: "https://aws.amazon.com/quick/" },
    PRICING: { title: "Amazon Bedrock 料金 / AWS コスト管理", url: "https://aws.amazon.com/bedrock/pricing/" }
  }
};

window.QUESTIONS = [];

// Q(ドメイン, 問題文, 選択肢[], 正解(数値 or 配列), 解説, 参考キー)
// 正解が配列なら複数選択問題。IDはドメインごとの登録順で固定される。
(function () {
  var counters = { 1: 0, 2: 0, 3: 0, 4: 0 };
  window.Q = function (domain, question, choices, answer, explanation, ref) {
    counters[domain] += 1;
    var multi = Array.isArray(answer);
    window.QUESTIONS.push({
      id: "d" + domain + "-" + String(counters[domain]).padStart(3, "0"),
      domain: domain,
      type: multi ? "multi" : "single",
      question: question,
      choices: choices,
      answer: multi ? answer.slice().sort() : [answer],
      explanation: explanation,
      ref: ref || "GUIDE"
    });
  };
})();
