from datetime import datetime


class Planner:
    def __init__(self, memory, knowledge):
        self.memory = memory
        self.knowledge = knowledge

    def create_plan(self, topic):
        recent = self.memory.load_recent(limit=3)
        context = self.knowledge.query(topic)
        plan = [
            f"目的整理: {topic}",
            "必要データの洗い出し（KPI/売上/コスト/チャネル）",
            "要約の作成（結論→根拠→次アクション）",
        ]
        if recent:
            plan.append("過去の学習メモを参照して改善点を反映")
        if context:
            plan.append("知識ベースの参考情報を反映")
        return {
            "created_at": datetime.utcnow().isoformat() + "Z",
            "steps": plan,
            "context": context,
            "recent": recent,
        }


class Builder:
    def __init__(self, knowledge):
        self.knowledge = knowledge

    def build_report(self, topic, plan):
        context = plan.get("context") or "（知識ベースの情報はありません）"
        steps = "\n".join([f"- {step}" for step in plan.get("steps", [])])
        report = f"""# KPIレポート

## テーマ
{topic}

## 要約
今週は主要KPIに変動が見られたため、優先順位を再整理する必要があります。

## 根拠
{context}

## 次アクション
- 主要KPIの下落要因を分解
- 高インパクト施策の優先順位付け
- 来週の仮説検証プランを作成

## 実行計画
{steps}
"""
        return report

    def rewrite_report(self, report, feedback):
        addition = "\n\n## 改善メモ\n" + feedback
        return report + addition


class Critic:
    def evaluate(self, report):
        score = 0.6
        feedback = []

        if "要約" in report:
            score += 0.15
        else:
            feedback.append("要約セクションを追加してください。")

        if "根拠" in report:
            score += 0.15
        else:
            feedback.append("根拠（データ/情報源）を明記してください。")

        if "次アクション" in report:
            score += 0.1
        else:
            feedback.append("次アクションを明確にしてください。")

        score = min(score, 0.95)
        if not feedback:
            feedback.append("十分に整理されています。")

        return score, "\n".join(feedback)
