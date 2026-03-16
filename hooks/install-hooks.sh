#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# GoalPulse — Git Hook Kurulum Scripti
# Kullanım: bash hooks/install-hooks.sh
# ═══════════════════════════════════════════════════════════════════════════════

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="$ROOT/hooks"
HOOKS_DEST="$ROOT/.git/hooks"

GREEN='\033[0;32m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'

echo -e "${BOLD}GoalPulse Git Hook Kurulumu${RESET}"
echo "─────────────────────────────"

if [[ ! -d "$ROOT/.git" ]]; then
  echo -e "${RED}❌ Bu bir git repository değil!${RESET}"
  exit 1
fi

# Kurulacak hook'lar
HOOKS=("pre-commit" "pre-push")

for hook in "${HOOKS[@]}"; do
  src="$HOOKS_SRC/$hook"
  dest="$HOOKS_DEST/$hook"

  if [[ ! -f "$src" ]]; then
    echo -e "  ${RED}✗${RESET} $hook kaynağı bulunamadı: $src"
    continue
  fi

  # Eski hook'u yedekle
  if [[ -f "$dest" && ! -L "$dest" ]]; then
    mv "$dest" "${dest}.backup.$(date +%Y%m%d%H%M%S)"
    echo "  → Eski $hook yedeklendi"
  fi

  # Semlink oluştur (dosya kopyası değil, böylece hooks/ klasöründeki değişiklikler anında yansır)
  ln -sf "$src" "$dest"
  chmod +x "$src"
  echo -e "  ${GREEN}✓${RESET} $hook kuruldu (symlink: .git/hooks/$hook → hooks/$hook)"
done

# validate.sh çalıştırılabilir yap
chmod +x "$HOOKS_SRC/validate.sh"
echo -e "  ${GREEN}✓${RESET} validate.sh çalıştırılabilir yapıldı"

echo ""
echo -e "${GREEN}${BOLD}✅ Hook kurulumu tamamlandı!${RESET}"
echo ""
echo "  Aktif hooklar:"
echo "    git commit  →  hooks/pre-commit"
echo "    git push    →  hooks/pre-push"
echo ""
echo "  Manuel çalıştırma: bash hooks/validate.sh"
