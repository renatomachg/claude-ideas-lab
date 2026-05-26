#!/usr/bin/env python3
import sys, json

try:
    d = json.load(sys.stdin)
    fp = d.get("tool_input", {}).get("file_path", "")
    if not fp:
        sys.exit(0)
    with open(fp) as f:
        lines = sum(1 for _ in f)
    if lines > 3000:
        name = fp.split("/")[-1]
        print(
            f"\n⚠️  {name} tiene {lines} líneas — considera extraer un componente con /split-component.\n",
            file=sys.stderr,
        )
except Exception:
    pass
