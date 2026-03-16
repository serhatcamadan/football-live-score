#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# GoalPulse — Claude Code PostToolUse Hook
# Her Write/Edit işleminden sonra otomatik çalışır.
# Hızlı kontrol — sadece kritik hatalar için.
# ═══════════════════════════════════════════════════════════════════════════════

ROOT="/Users/camoke/Desktop/football-live-score"
ERRORS=0

# Değiştirilen dosya (Claude Code TOOL_INPUT_FILE env'den geçirir)
CHANGED_FILE="${TOOL_INPUT_FILE:-}"

# ── Hızlı JS sentaks kontrolü ─────────────────────────────────────────────────
if [[ "$CHANGED_FILE" == *.js ]] && command -v node &>/dev/null; then
  if ! node --check "$CHANGED_FILE" 2>/dev/null; then
    echo "⚡ [GoalPulse] JS sentaks hatası: $(basename "$CHANGED_FILE")"
    node --check "$CHANGED_FILE" 2>&1
    ((ERRORS++)) || true
  fi
fi

# ── Kritik dosyalar silinmedi mi? ─────────────────────────────────────────────
CRITICAL=("$ROOT/index.html" "$ROOT/src/app.js" "$ROOT/src/data.js" "$ROOT/src/style.css")
for f in "${CRITICAL[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "⚡ [GoalPulse] KRİTİK DOSYA SİLİNDİ: $f"
    ((ERRORS++)) || true
  fi
done

# ── index.html referans bütünlüğü ────────────────────────────────────────────
if [[ "$CHANGED_FILE" == */index.html || -z "$CHANGED_FILE" ]]; then
  HTML="$ROOT/index.html"
  if [[ -f "$HTML" ]]; then
    if ! grep -q 'src/app.js'  "$HTML"; then
      echo "⚡ [GoalPulse] index.html'de src/app.js referansı kayboldu!"
      ((ERRORS++)) || true
    fi
    if ! grep -q 'src/data.js' "$HTML"; then
      echo "⚡ [GoalPulse] index.html'de src/data.js referansı kayboldu!"
      ((ERRORS++)) || true
    fi
    if ! grep -q 'src/style.css' "$HTML"; then
      echo "⚡ [GoalPulse] index.html'de src/style.css referansı kayboldu!"
      ((ERRORS++)) || true
    fi
  fi
fi

# ── API key sızdırma anlık kontrol ───────────────────────────────────────────
if [[ "$CHANGED_FILE" == *.js ]]; then
  if grep -qiP "(x-rapidapi-key|api[_-]?key)\s*[:=]\s*['\"]?[a-zA-Z0-9]{30,}" "$CHANGED_FILE" 2>/dev/null; then
    echo "⚡ [GoalPulse] UYARI: $CHANGED_FILE içinde API key olabilir!"
    ((ERRORS++)) || true
  fi
fi

if [[ $ERRORS -gt 0 ]]; then
  echo ""
  echo "⚡ [GoalPulse] $ERRORS kritik sorun tespit edildi. 'bash hooks/validate.sh' çalıştır."
fi

exit 0   # PostToolUse hook'u asla 1 döndürmemeli (Claude'u bloklamamak için)
