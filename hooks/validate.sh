#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# GoalPulse — Proje Doğrulama Scripti
# Kullanım: bash hooks/validate.sh
# Çıkış kodu: 0 = başarılı, 1 = hata var
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ERRORS=0
WARNINGS=0

# ── Renkler ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✓${RESET} $1"; }
warn() { echo -e "  ${YELLOW}⚠${RESET}  $1"; ((WARNINGS++)) || true; }
fail() { echo -e "  ${RED}✗${RESET} $1"; ((ERRORS++)) || true; }
section() { echo -e "\n${CYAN}${BOLD}▶ $1${RESET}"; }

echo -e "${BOLD}GoalPulse — Proje Doğrulaması${RESET}"
echo "────────────────────────────────────"

# ═══════════════════════════════════════════════════════════════════════════════
# 1. ZORUNLU DOSYA YAPISI
# ═══════════════════════════════════════════════════════════════════════════════
section "Dosya Yapısı"

REQUIRED_FILES=(
  "index.html"
  "src/app.js"
  "src/data.js"
  "src/style.css"
  "CLAUDE.md"
  "package.json"
)
for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "$ROOT/$f" ]]; then
    ok "$f mevcut"
  else
    fail "$f EKSİK!"
  fi
done

# ═══════════════════════════════════════════════════════════════════════════════
# 2. index.html KAYNAK REFERANSLARI
# ═══════════════════════════════════════════════════════════════════════════════
section "index.html Referans Kontrolü"

HTML="$ROOT/index.html"

# Script src paths — yerel dosya referanslarını kontrol et
for ref in "src/app.js" "src/data.js" "src/style.css"; do
  if grep -q "$ref" "$HTML" 2>/dev/null; then
    if [[ -f "$ROOT/$ref" ]]; then
      ok "\"$ref\" referansı var ve dosya mevcut"
    else
      fail "\"$ref\" HTML'de referans var ama DOSYA YOK!"
    fi
  else
    fail "\"$ref\" index.html'de referans edilmiyor!"
  fi
done

# Tailwind CDN script var mı?
if grep -qi "cdn.tailwindcss.com" "$HTML" 2>/dev/null; then
  ok "Tailwind CDN script referansı var"
else
  warn "Tailwind CDN bulunamadı (dist/output.css kullanılıyor olabilir)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 3. GÜVENLİK — API KEY SIZDIRMAMA
# ═══════════════════════════════════════════════════════════════════════════════
section "Güvenlik & API Key Kontrolü"

# RapidAPI key formatı: x-rapidapi-key + 30+ karakter değer (BSD grep -E)
if grep -rqiE "x-rapidapi-key.{0,10}[a-zA-Z0-9]{30,}" "$ROOT/src/" 2>/dev/null; then
  # Sadece placeholder değilse hata ver
  if ! grep -rqiE "x-rapidapi-key.{0,10}BURAYA" "$ROOT/src/" 2>/dev/null; then
    fail "src/ içinde gerçek bir RapidAPI key tespit edildi! Commit etme."
  else
    ok "Gerçek API key bulunamadı (güvenli)"
  fi
else
  ok "Gerçek API key bulunamadı (güvenli)"
fi

# Genel API key pattern'leri
if grep -rqiE "(api_key|apikey|secret|password)\s*=\s*['\"][a-zA-Z0-9+/]{20,}" "$ROOT/src/" 2>/dev/null; then
  fail "src/ içinde hardcoded credential tespit edildi!"
else
  ok "Hardcoded credential yok"
fi

# .env dosyası tracked mı?
if [[ -f "$ROOT/.env" ]]; then
  if git -C "$ROOT" ls-files --error-unmatch .env &>/dev/null 2>&1; then
    fail ".env dosyası git tarafından takip ediliyor! .gitignore'a ekle."
  else
    warn ".env mevcut ama git ignore'da, dikkatli ol"
  fi
else
  ok ".env dosyası yok (normal)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4. FRAMEWORK YASAĞI (React, Vue, Next.js yasak)
# ═══════════════════════════════════════════════════════════════════════════════
section "Framework Yasağı Kontrolü"

FORBIDDEN_IMPORTS=("from 'react'" 'from "react"' "require('react')" 'require("react")'
                   "from 'vue'" 'from "vue"' "from 'next'" 'from "next"'
                   "import React" "@vue/" "nuxt")
FOUND_FRAMEWORK=false
for pattern in "${FORBIDDEN_IMPORTS[@]}"; do
  if grep -rq "$pattern" "$ROOT/src/" 2>/dev/null; then
    fail "Yasak framework import'u bulundu: '$pattern'"
    FOUND_FRAMEWORK=true
  fi
done
$FOUND_FRAMEWORK || ok "Framework import'u yok (Vanilla JS ✓)"

# ═══════════════════════════════════════════════════════════════════════════════
# 5. JAVASCRIPT SENTAKSİ
# ═══════════════════════════════════════════════════════════════════════════════
section "JavaScript Sentaks Kontrolü"

if command -v node &>/dev/null; then
  for jsfile in "$ROOT/src/app.js" "$ROOT/src/data.js"; do
    [[ -f "$jsfile" ]] || continue
    filename=$(basename "$jsfile")
    if node --check "$jsfile" 2>/dev/null; then
      ok "$filename sentaks geçerli"
    else
      fail "$filename SENTAKS HATASI!"
      node --check "$jsfile" 2>&1 | while read -r errline; do
        echo "    $errline"
      done
    fi
  done
else
  warn "Node.js bulunamadı, JS sentaks kontrolü atlandı"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 6. DARK MODE STRATEJİSİ (class stratejisi zorunlu)
# ═══════════════════════════════════════════════════════════════════════════════
section "Dark Mode Strateji Kontrolü"

if grep -q "darkMode: 'class'" "$HTML" 2>/dev/null || \
   grep -q 'darkMode: "class"' "$HTML" 2>/dev/null || \
   grep -q "darkMode:'class'" "$HTML" 2>/dev/null; then
  ok "Tailwind dark mode: 'class' stratejisi aktif"
else
  fail "index.html'de tailwind.config darkMode:'class' bulunamadı!"
fi

if grep -q 'classList.*toggle.*dark\|classList.*add.*dark' "$ROOT/src/app.js" 2>/dev/null; then
  ok "app.js dark mode toggle mantığı mevcut"
else
  warn "app.js'de dark mode toggle bulunamadı"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 7. VERSİYON KONTROLÜ
# ═══════════════════════════════════════════════════════════════════════════════
section "Versiyon Kontrolü"

if grep -q "APP_VERSION" "$ROOT/src/data.js" 2>/dev/null; then
  version=$(grep "APP_VERSION" "$ROOT/src/data.js" | grep -oE "'[^']+'" | tr -d "'")
  ok "APP_VERSION = '$version'"
else
  warn "src/data.js'de APP_VERSION bulunamadı"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 8. CONSOLE.LOG UYARISI
# ═══════════════════════════════════════════════════════════════════════════════
section "Console.log Kontrolü"

LOG_COUNT=$(grep -rcs "console\.log" "$ROOT/src/" 2>/dev/null | awk -F: '{sum+=$NF} END{print sum+0}')
if [[ "$LOG_COUNT" -eq 0 ]]; then
  ok "console.log bulunamadı"
elif [[ "$LOG_COUNT" -le 5 ]]; then
  warn "$LOG_COUNT adet console.log var (production'dan önce kaldır)"
else
  fail "$LOG_COUNT adet console.log var — production kodunda fazla!"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 9. VERİ MODELİ TUTARLILIĞI
# ═══════════════════════════════════════════════════════════════════════════════
section "Veri Modeli Tutarlılığı"

DATA="$ROOT/src/data.js"
APP="$ROOT/src/app.js"

# LEAGUES, TEAMS, MATCHES, STANDINGS, TOP_SCORERS hepsi var mı?
for varname in "const LEAGUES" "const TEAMS" "const MATCHES" "const STANDINGS" "const TOP_SCORERS"; do
  if grep -q "$varname" "$DATA" 2>/dev/null; then
    ok "${varname/const /} tanımlı"
  else
    fail "$varname src/data.js'de tanımlı DEĞİL!"
  fi
done

# app.js bu değişkenleri kullanıyor mu?
for varname in "LEAGUES" "TEAMS" "MATCHES" "STANDINGS" "TOP_SCORERS"; do
  if grep -q "$varname" "$APP" 2>/dev/null; then
    ok "$varname app.js'de kullanılıyor"
  else
    warn "$varname app.js'de kullanılmıyor (gereksiz mi?)"
  fi
done

# ═══════════════════════════════════════════════════════════════════════════════
# SONUÇ
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "────────────────────────────────────"
if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}✅ Tüm kontroller geçti! Proje sağlıklı.${RESET}"
elif [[ $ERRORS -eq 0 ]]; then
  echo -e "${YELLOW}${BOLD}⚠️  $WARNINGS uyarı var, $ERRORS hata. Devam edilebilir.${RESET}"
else
  echo -e "${RED}${BOLD}❌ $ERRORS hata, $WARNINGS uyarı tespit edildi!${RESET}"
fi
echo ""

exit $ERRORS
