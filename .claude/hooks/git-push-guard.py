#!/usr/bin/env python3
import sys, json

try:
    d = json.load(sys.stdin)
    cmd = d.get("tool_input", {}).get("command", "")
    if "git push" in cmd:
        print(
            "\n🚫 BLOQUEADO: Necesitas aprobación explícita del usuario antes de hacer push.\n"
            "   (CLAUDE.md regla #1: nunca commit/push sin aprobación)\n",
            file=sys.stderr,
        )
        sys.exit(1)
except Exception:
    pass
