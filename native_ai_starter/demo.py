#!/usr/bin/env python3
import os
import sys
from datetime import datetime

from agents import Planner, Builder, Critic
from knowledge import KnowledgeBase
from memory import MemoryStore


def main():
    topic = "今週のKPIレポートを作って"
    if len(sys.argv) > 1:
        topic = sys.argv[1]

    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    memory = MemoryStore(base_dir)
    knowledge = KnowledgeBase(base_dir)

    planner = Planner(memory, knowledge)
    builder = Builder(knowledge)
    critic = Critic()

    plan = planner.create_plan(topic)
    report = builder.build_report(topic, plan)
    score, feedback = critic.evaluate(report)

    max_rewrites = 2
    rewrites = 0
    while score < 0.75 and rewrites < max_rewrites:
        report = builder.rewrite_report(report, feedback)
        score, feedback = critic.evaluate(report)
        rewrites += 1

    report_path = os.path.join(output_dir, "report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    memory.save(topic, score, feedback)

    print("==> 完了")
    print(f"レポート: {report_path}")
    print(f"スコア: {score:.2f}")
    print(f"更新日時: {datetime.utcnow().isoformat()}Z")


if __name__ == "__main__":
    main()
