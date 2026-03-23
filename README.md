# Energy Hub by DPU — setup

Staticky hub s nastroji DPU Energy. Hostovano na **Cloudflare Pages**, chraneno **Cloudflare Access** (email OTP).

---

## Struktura repozitare

```
dpu-hub/
├── index.html          ← hlavni dashboard
├── fve-bess/
│   └── index.html      ← zkopiruj sem "Dimenzovani FVE a BESS.html"
├── sazby/
│   └── index.html      ← zkopiruj sem "Kalkulator distribucnich sazeb.html"
├── prompty/
│   └── index.html      ← dokumentace ChatGPT promptu
└── README.md
```

---

## Krok 1 — Priprava repozitare

1. Vytvor novy **private** repozitar na GitHubu: `dpu-hub`
2. Inicializuj git v teto slozce a pushni:

```bash
git init
git add .
git commit -m "initial: hub dashboard + prompty"
git remote add origin https://github.com/TVOJE-ORG/dpu-hub.git
git push -u origin main
```

3. Zkopiruj nastroje do spravnych slozek:
   - `Dimenzovani FVE a BESS.html`  →  `fve-bess/index.html`
   - `Kalkulator distribucnich sazeb.html`  →  `sazby/index.html`

---

## Krok 2 — Cloudflare Pages (hosting)

1. Jdi na [pages.cloudflare.com](https://pages.cloudflare.com) a prihlас se (nebo zaloz ucet zdarma).
2. Klikni **Create a project → Connect to Git**.
3. Vyberes repozitar `dpu-hub`.
4. Nastav:
   - **Framework preset:** None
   - **Build command:** (prazdne)
   - **Build output directory:** `/` (root)
5. Klikni **Save and Deploy**.

Po deploymentu dostanes URL ve tvaru `dpu-hub-xxx.pages.dev`.

---

## Krok 3 — Cloudflare Access (prihlaseni)

Tato cast chrani hub pred neautorizovanym pristupem. Kolegove se prihlasi jednorázovym kodem na email — zadna hesla.

1. Prihlас se na [one.dash.cloudflare.com](https://one.dash.cloudflare.com) → **Zero Trust** (levy panel).
2. Zaloz ucet Zero Trust (free plan, az 50 uzivatelu).
3. Jdi na **Access → Applications → Add an application**.
4. Vyber **Self-hosted**.
5. Vyplн:
   - **Application name:** Energy Hub DPU
   - **Application domain:** `dpu-hub-xxx.pages.dev` (tvoje Pages URL)
   - **Path:** `/` (chrani cely web)
6. Klikni **Next → Add a policy**.
7. Nastav politiku:
   - **Policy name:** Kolegove DPU
   - **Action:** Allow
   - **Include rule:** Email → zadej e-maily kolegu (nebo Email domain → `dpurevit.cz`)
8. Uloz a dokoncи.

Hotovo. Pri pristupu na URL Cloudflare vyzve k zadani emailu a posle OTP kod.

---

## Krok 4 — Overeni

Otevri v anonymnim okne URL `dpu-hub-xxx.pages.dev` — mel by se zobrazit prihlasovaci formular Cloudflare Access.

---

## Aktualizace nastroje

Kazdy nastroj je samostatny soubor. Postup:

1. Uprav soubor (napr. `fve-bess/index.html`).
2. `git add fve-bess/index.html && git commit -m "update: FVE kalkulator" && git push`
3. Cloudflare Pages automaticky deployuje do ~30 sekund.
4. Ostatni nastroje (sazby, prompty, index) se nemeni.

---

## Faze 2 — Backendy (TÄŒ, Profily, Wind)

Viz hlavni plan architektury. Az budou backendy online, staci v `index.html` doplnit URL do odkazu u prislusnych karet a zmenit `btn-disabled` na `btn-primary`.

---

## Bezpecnost

- `github-recovery-codes.txt` ze slozky Nastroje **nepridavej do tohoto repozitare**.
- OpenAI API klice a jine tajne hodnoty se konfiguruji jako **environment variables** na strane hostingove platformy (Vercel, Railway) — nikdy v kodu.
