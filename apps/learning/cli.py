#!/usr/bin/env python3
import argparse

from .engine import update_learning


def show_status() -> None:
    payload = update_learning()
    if not payload.get("best_format_by_timewindow"):
        print("まだ十分なmetricsがありません。")
        return
    for window, info in payload["best_format_by_timewindow"].items():
        print(f"{window}: format={info['format']} score={info['score']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Learning updater")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("update")
    sub.add_parser("status")

    args = parser.parse_args()
    if args.command == "update":
        update_learning()
        print("learning.json updated")
    elif args.command == "status":
        show_status()


if __name__ == "__main__":
    main()
