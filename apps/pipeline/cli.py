#!/usr/bin/env python3
import argparse
import os
import sys

sys.path.append(os.path.dirname(__file__))

from topics import schedule  # noqa: E402
from storage import (  # noqa: E402
    MemoryStore,
    Paths,
    read_optional_json,
    write_changes,
    write_last_success,
    write_run,
)


TOPIC_HANDLERS = {
    "schedule": schedule,
}


def get_handler(topic):
    handler = TOPIC_HANDLERS.get(topic)
    if not handler:
        raise ValueError(f"Unsupported topic: {topic}")
    return handler


def handle_collect(args):
    handler = get_handler(args.topic)
    run_id = Paths.run_id()
    status = "ok"
    error = ""
    facts = None
    sources = None
    Paths.ensure()
    try:
        facts, sources = handler.collect(date=args.date, region=args.region)
    except Exception as exc:
        error = str(exc)
        fallback = read_optional_json(Paths.last_success_path())
        if fallback:
            status = "degraded"
            facts = Paths.read_json(fallback["facts_path"])
            sources = Paths.read_json(fallback["sources_path"])
        else:
            status = "fail"
    if facts is not None and sources is not None:
        Paths.write_json(Paths.facts_path(args.topic), facts)
        Paths.write_json(Paths.sources_path(args.topic), sources)
    run_meta = {
        "run_id": run_id,
        "stage": "collect",
        "topic": args.topic,
        "date": args.date,
        "region": args.region,
        "status": status,
        "error": error,
        "facts_path": Paths.facts_path(args.topic) if facts is not None else None,
        "sources_path": Paths.sources_path(args.topic) if sources is not None else None,
    }
    write_run(Paths.run_path(run_id), run_meta)
    if status == "ok":
        write_last_success(
            Paths.last_success_path(),
            {
                "run_id": run_id,
                "topic": args.topic,
                "date": args.date,
                "region": args.region,
                "facts_path": Paths.facts_path(args.topic),
                "sources_path": Paths.sources_path(args.topic),
            },
        )
    if status == "fail":
        print(f"[collect] failed: {error}")
        sys.exit(1)
    print(f"[collect] facts: {Paths.facts_path(args.topic)}")
    print(f"[collect] sources: {Paths.sources_path(args.topic)}")
    if status == "degraded":
        print(f"[collect] degraded: {error}")


def handle_validate(args):
    handler = get_handler(args.topic)
    facts = Paths.read_json(Paths.facts_path(args.topic))
    sources = Paths.read_json(Paths.sources_path(args.topic))
    run_id = Paths.run_id()
    previous = read_optional_json(Paths.last_success_path())
    previous_facts = None
    if previous:
        previous_facts = Paths.read_json(previous["facts_path"])
    issues, changes = handler.validate(
        facts=facts,
        sources=sources,
        region=args.region or facts.get("region", "JP"),
        previous_facts=previous_facts,
    )
    Paths.write_json(Paths.facts_path(args.topic), facts)
    if changes:
        write_changes(Paths.changes_path(facts["date"]), {"changes": changes})
    if issues:
        write_run(
            Paths.run_path(run_id),
            {
                "run_id": run_id,
                "stage": "validate",
                "topic": args.topic,
                "date": facts.get("date"),
                "region": facts.get("region"),
                "status": "fail",
                "issues": issues,
                "change_count": len(changes),
            },
        )
        print("[validate] issues:")
        for issue in issues:
            print(f"- {issue}")
        sys.exit(1)
    write_run(
        Paths.run_path(run_id),
        {
            "run_id": run_id,
            "stage": "validate",
            "topic": args.topic,
            "date": facts.get("date"),
            "region": facts.get("region"),
            "status": "ok",
            "change_count": len(changes),
        },
    )
    print("[validate] ok")


def handle_compose(args):
    handler = get_handler(args.topic)
    facts = Paths.read_json(Paths.facts_path(args.topic))
    sources = Paths.read_json(Paths.sources_path(args.topic))
    memory = MemoryStore(Paths.memory_path())
    changes = None
    if args.mode == "changes":
        changes_payload = read_optional_json(Paths.changes_path(facts["date"]))
        changes = (changes_payload or {}).get("changes", [])
    content = handler.compose(
        facts=facts,
        sources=sources,
        channel=args.channel,
        memory=memory,
        region=args.region or facts.get("region", "JP"),
        format_id=args.format,
        mode=args.mode,
        changes=changes,
    )
    Paths.ensure()
    Paths.write_text(Paths.content_path(args.topic, args.channel), content)
    Paths.write_json(
        Paths.content_meta_path(args.topic, args.channel),
        {
            "topic": args.topic,
            "channel": args.channel,
            "format": facts.get("resolved_format", args.format),
            "mode": args.mode,
            "region": args.region or facts.get("region", "JP"),
            "match_count": len(facts.get("fixtures", [])),
        },
    )
    print(f"[compose] content: {Paths.content_path(args.topic, args.channel)}")


def handle_publish(args):
    handler = get_handler(args.topic)
    path = Paths.content_path(args.topic, args.channel)
    content = Paths.read_text(path)
    meta = read_optional_json(Paths.content_meta_path(args.topic, args.channel)) or {}
    run_id = Paths.run_id()
    result = handler.publish(
        content,
        args.mode,
        MemoryStore(Paths.memory_path()),
        meta=meta,
        run_id=run_id,
    )
    write_run(
        Paths.run_path(run_id),
        {
            "run_id": run_id,
            "stage": "publish",
            "topic": args.topic,
            "channel": args.channel,
            "mode": args.mode,
            "status": result.get("status"),
        },
    )
    if result.get("status") == "skipped":
        print("[publish] skipped: duplicate content")
        return
    output = result.get("output", content)
    print(output)


def main():
    parser = argparse.ArgumentParser(description="Soccer media pipeline CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    collect = subparsers.add_parser("collect")
    collect.add_argument("--topic", required=True)
    collect.add_argument("--date", default="today")
    collect.add_argument("--region", default="JP")
    collect.set_defaults(func=handle_collect)

    validate = subparsers.add_parser("validate")
    validate.add_argument("--topic", required=True)
    validate.add_argument("--region", default="")
    validate.set_defaults(func=handle_validate)

    compose = subparsers.add_parser("compose")
    compose.add_argument("--topic", required=True)
    compose.add_argument("--channel", required=True)
    compose.add_argument("--format", type=int, default=0, choices=[0, 1, 2, 3])
    compose.add_argument("--mode", default="full", choices=["full", "changes"])
    compose.add_argument("--region", default="")
    compose.set_defaults(func=handle_compose)

    publish = subparsers.add_parser("publish")
    publish.add_argument("--topic", required=True)
    publish.add_argument("--channel", required=True)
    publish.add_argument(
        "--mode", default="dry-run", choices=["dry-run", "manual", "api"]
    )
    publish.set_defaults(func=handle_publish)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
