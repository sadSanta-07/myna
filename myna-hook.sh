#!/usr/bin/env bash
# myna-hook.sh
# Unix (Bash/Zsh) Guardrail Hook for MYNA Local Input Gate

_myna_check_cmd() {
    local cmd="$1"
    if [ -z "$cmd" ] || [[ "$cmd" == _myna_* ]] || [[ "$cmd" == *"myna-hook"* ]]; then
        return 0
    fi

    local escaped_cmd
    escaped_cmd=$(printf '%s' "$cmd" | sed 's/\\/\\\\/g; s/"/\\"/g')
    local json_body="{\"cmd\":\"$escaped_cmd\"}"

    local response
    if command -v nc >/dev/null 2>&1; then
        response=$(printf "%s" "$json_body" | nc -U "$MYNA_GATE_PIPE" 2>/dev/null)
    elif command -v socat >/dev/null 2>&1; then
        response=$(printf "%s" "$json_body" | socat - UNIX-CONNECT:"$MYNA_GATE_PIPE" 2>/dev/null)
    else
        return 1
    fi

    if [ -n "$response" ] && printf '%s' "$response" | grep -q '"allowed":false'; then
        printf "\n\033[31m⚠️  [myna] Host blocked this command.\033[0m\n"
        return 1
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