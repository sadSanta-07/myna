#!/usr/bin/env bash
# myna-hook.sh
# Unix (Bash/Zsh) Guardrail Hook for MYNA Local Input Gate

_myna_check_cmd() {
    local cmd="$1"

    if [ -z "$cmd" ] || [[ "$cmd" == _myna_* ]] || [[ "$cmd" == *"myna-hook"* ]]; then
        return 0
    fi

    # Escape JSON string cleanly
    local json_body
    if command -v python3 >/dev/null 2>&1; then
        json_body=$(python3 -c "import json, sys; print(json.dumps({'cmd': sys.argv[1]}))" "$cmd")
    else
        local escaped_cmd
        escaped_cmd=$(printf '%s' "$cmd" | sed 's/\\/\\\\/g; s/"/\\"/g')
        json_body="{\"cmd\":\"$escaped_cmd\"}"
    fi

    local response
    response=$(curl -s -m 15 -X POST http://127.0.0.1:41234/check \
        -H "Content-Type: application/json" \
        -d "$json_body" 2>/dev/null)

    if [ $? -eq 0 ] && [ -n "$response" ]; then
        if printf '%s' "$response" | grep -q '"allowed":false'; then
            printf "\n\033[31m⚠️  [myna] Host blocked this command.\033[0m\n"
            return 1
        fi
    fi
    return 0
}

if [ -n "$BASH_VERSION" ]; then
    set -o functrace
    _myna_bash_trap() {
        if [ -n "$COMP_LINE" ]; then return; fi
        _myna_check_cmd "$BASH_COMMAND" || return 1
    }
    trap '_myna_bash_trap' DEBUG
fi

if [ -n "$ZSH_VERSION" ]; then
    preexec() {
        _myna_check_cmd "$1" || return 1
    }
fi

printf "\033[36m[myna] Unix guardrail hook connected to Local Input Gate.\033[0m\n"