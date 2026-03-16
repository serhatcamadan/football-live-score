# GoalPulse — Proje Kuralları & Uyumluluk Kılavuzu

> Bu dosya `hooks/validate.sh`, `hooks/pre-commit` ve `hooks/pre-push` tarafından
> otomatik olarak uygulanan kuralları belgeler.

---

## 1. Dosya Yapısı Kuralları

| Kural | Açıklama |
|-------|----------|
| ✅ Zorunlu | `index.html` proje kökünde olmalı |
| ✅ Zorunlu | `src/app.js` — tüm uygulama mantığı burada |
| ✅ Zorunlu | `src/data.js` — tüm dummy/statik veri burada |
| ✅ Zorunlu | `src/style.css` — özel CSS burada |
| ✅ Zorunlu | `CLAUDE.md` — hiçbir zaman silme |
| ✅ Zorunlu | `package.json` — bağımlılıklar burada |
| ❌ Yasak | `app.js`, `data.js`, `style.css` kök dizinde (src/ içinde olmalı) |
| ❌ Yasak | `.env` dosyasını git'e commit etme |

---

## 2. Teknoloji Kuralları

| Kural | Açıklama |
|-------|----------|
| ✅ İzinli | HTML, CSS, Tailwind CSS (CDN), Vanilla JavaScript |
| ✅ İzinli | `live-server` (geliştirme sunucusu) |
| ✅ İzinli | `@tailwindcss/cli` (CSS build) |
| ❌ Yasak | React, Vue, Next.js, Angular, Svelte veya herhangi bir JS framework |
| ❌ Yasak | jQuery |
| ❌ Yasak | TypeScript (vanilla JS projesi) |
| ❌ Yasak | CSS-in-JS kütüphaneleri |

**Neden?** CLAUDE.md'de belgelenmiş mimari karar. Proje kasıtlı olarak
framework-free Vanilla JS + Tailwind olarak tasarlanmıştır.

---

## 3. Güvenlik Kuralları

| Kural | Açıklama |
|-------|----------|
| ❌ Asla | Gerçek API key'leri kaynak koda yazma |
| ❌ Asla | `.env` dosyasını commit etme |
| ✅ Doğru | API key için `const API_KEY = 'BURAYA_API_KEY'` placeholder kullan |
| ✅ Doğru | Gerçek key kullanacaksan `.env` + `.gitignore` kombinasyonu kullan |
| ❌ Asla | `password`, `secret`, `token` gibi credential'ları hardcode etme |

**Kontrol edilecek pattern'ler:**
```
x-rapidapi-key = "abc123..."   # ❌ Yasak
API_KEY = "abc123..."          # ❌ Yasak
const API_KEY = 'BURAYA_KEY';  # ✅ İzinli (placeholder)
```

---

## 4. Dark Mode Kuralları

| Kural | Açıklama |
|-------|----------|
| ✅ Zorunlu | `tailwind.config` içinde `darkMode: 'class'` |
| ✅ Zorunlu | `document.documentElement.classList.toggle('dark')` kullan |
| ✅ Zorunlu | Yeni UI elementlerinde `dark:` prefix kullan |
| ❌ Yasak | `darkMode: 'media'` (sistem tercihine bağlı, kontrol edilemez) |
| ❌ Yasak | CSS `@media (prefers-color-scheme)` dark mode için |

---

## 5. Veri Modeli Kuralları

`src/data.js` içindeki veri yapıları değiştirilirse `src/app.js` de güncellenmeli.

### MATCHES nesnesi zorunlu alanlar:
```js
{
  id,           // Benzersiz integer
  league,       // LEAGUES objesindeki geçerli bir key
  status,       // 'live' | 'finished' | 'upcoming'
  home, away,   // TEAMS objesindeki geçerli key'ler
  score: { home, away },
  stats: {},
  events: []
}
```

### Yeni lig eklerken:
1. `LEAGUES` objesine ekle (id, name, country, apiId, flag, logo)
2. `index.html`'deki lig filtre bar'ına buton ekle
3. `STANDINGS` ve `TOP_SCORERS`'a veri ekle

### Yeni takım eklerken:
1. `TEAMS` objesine ekle (id, name, shortName, logo, color)
2. Logo URL'si Wikipedia SVG tercih edilir

---

## 6. JavaScript Kod Kuralları

| Kural | Açıklama |
|-------|----------|
| ✅ Zorunlu | `node --check` ile sentaks geçmeli |
| ⚠️ Uyarı | `console.log` üretim kodunda maksimum 5 adet |
| ❌ Yasak | `eval()` kullanımı |
| ❌ Yasak | `document.write()` |
| ✅ Tercih | `const` / `let`, `var` kullanma |
| ✅ Tercih | Arrow function'lar callback için |

---

## 7. CSS Kuralları

| Kural | Açıklama |
|-------|----------|
| ✅ Zorunlu | Tailwind CDN sınıfları veya `src/style.css` |
| ✅ Tercih | Mobile-first (`sm:`, `md:`, `lg:` breakpoint'leri) |
| ❌ Yasak | Inline `style` attribute'u sadece dinamik değerler için kullan |
| ❌ Yasak | `!important` (sınırla, gerçekten gerekmedikçe) |
| ✅ Tercih | CSS custom properties yerine Tailwind sınıfları |

---

## 8. GitHub Push Kuralları

Push yapmadan önce şunların tamamlanmış olması gerekir:

- [ ] `bash hooks/validate.sh` hata yok
- [ ] Gerçek API key yok
- [ ] `src/app.js` ve `src/data.js` sentaks geçerli
- [ ] `index.html` dosya referansları doğru
- [ ] `CLAUDE.md` silinmemiş
- [ ] `.env` tracked değil

### Otomatik kontrol:
```bash
bash hooks/install-hooks.sh   # Bir kez çalıştır
git push                       # Artık otomatik kontrol edilir
```

---

## 9. Versiyon Yönetimi

| Durum | Versiyon |
|-------|----------|
| Dummy data, API yok | `1.0.0-dummy` |
| API bağlandı | `1.1.0` |
| Yeni özellik | Minor artır (1.2.0) |
| Bug fix | Patch artır (1.1.1) |

`src/data.js`: `APP_VERSION` ve `package.json`: `version` senkron tutulmalı.

---

## 10. Hook'ların Manuel Çalıştırılması

```bash
# Tam doğrulama
bash hooks/validate.sh

# Git hook'larını kur (bir kez)
bash hooks/install-hooks.sh

# Sadece commit kontrolü
bash hooks/pre-commit

# Sadece push kontrolü
bash hooks/pre-push
```

---

## Otomatik Hook Tetikleme Tablosu

| Olay | Hook | Ne Kontrol Eder |
|------|------|-----------------|
| `git commit` | `hooks/pre-commit` | JS sentaks, API key, framework yasağı, referanslar |
| `git push` | `hooks/pre-push` | Tam validate.sh + build güncel mi + CLAUDE.md var mı |
| Claude Write/Edit | `hooks/post-edit.sh` (Claude Code PostToolUse) | Hızlı: sentaks, kritik dosyalar, referanslar |
| Manuel | `hooks/validate.sh` | Tüm kontroller (9 kategori) |
