# ReadMe – Vyčítání ochlazovaných konstrukcí z PDF skenů pomocí PDF-XChange Editoru

Tento návod slouží pro systematický postup získávání technických údajů z projektové dokumentace ve formě PDF skenů – typicky půdorysy, řezy a legendy stavebních konstrukcí. Cílem je získat plochy, skladby a součinitele prostupu tepla pro ochlazované konstrukce rozdělené po jednotlivých zónách budovy.

---

## 1. OCR rozpoznání a posouzení kvality skenů

1. Otevři PDF v **PDF-XChange Editoru**.
2. V menu zvol `Document > OCR Pages…` (Dokument > OCR stránky…).
3. Vyber rozsah stránek (celé PDF, nebo jen vybrané).
4. Nastav jazyk rozpoznání (nejčastěji čeština).
5. Spusť OCR. Po dokončení ověř:
    - Které části jsou dobře rozpoznané a lze je kopírovat.
    - Kde jsou skeny příliš nekvalitní (rozmazané kóty, nečitelné popisy apod.).

> **Tip:** Pokud je OCR špatné, zkus zvýšit DPI při převodu, nebo přeuložit PDF do vyššího rozlišení.

---

## 2. Rozdělení budovy na zóny

1. Identifikuj zóny podle půdorysů, provozních částí nebo PENB (např. učební pavilon, tělocvična, kuchyně/jídelna apod.).
2. Poznamenej si čísla a názvy zón i stránky, na kterých je najdeš.
3. Založ si jednoduchý přehled (v Excelu, na papíře nebo v poznámkách):

    | Zóna            | Strana PDF | Typ podkladu (půdorys/řez) |
    |-----------------|------------|----------------------------|
    | Učební pavilon  | 5–7        | půdorys, řez               |
    | Tělocvična      | 10         | půdorys                    |
    | Kuchyně/jídelna | 8–9        | půdorys                    |

---

## 3. Měření rozměrů konstrukcí v PDF-XChange Editoru

### a) Nastavení měřítka

- Otevři výkres se známou kótou.
- Aktivuj **Measure Tool**: `Tools > Measure > Distance Tool`.
- Klikni na dvě známé vzdálenosti podle výkresu.
- Pravým tlačítkem zvol `Calibrate Measurement Tool`, zadej skutečnou délku (např. 5,00 m).
- Od této chvíle všechny měřené délky a plochy odpovídají skutečnosti.

### b) Měření délek a ploch

- **Délky stěn:** Pomocí „Distance Tool“ měř jednotlivé obvodové a vnitřní konstrukce.
- **Plachy konstrukcí:** Použij „Area Tool“ (`Tools > Measure > Area Tool`), obkresli polygonem celou konstrukci, editor spočítá plochu v m².

### c) Evidence měření

Každý výsledek si zapiš do tabulky – ručně nebo přímo do Excelu.

---

## 4. Získání a zápis skladeb konstrukcí

1. Najdi v dokumentaci výpisy skladeb nebo legendy vrstev (typicky vedle půdorysů nebo v technické zprávě).
2. Po OCR lze kopírovat skladby přímo do tabulky. Pokud chybí, poznamenej „nutno doplnit“ a použij typické hodnoty podle katalogu konstrukcí.

---

## 5. Zápis do výstupní tabulky (vzor níže)

Doporučená struktura tabulky pro evidenci ochlazovaných konstrukcí podle zón (použij např. v Excelu):

| Zóna             | Konstrukce        | Popis/umístění           | Plocha [m²] | Skladba konstrukce               | Stav         | Poznámka            |
|------------------|-------------------|--------------------------|-------------|----------------------------------|--------------|---------------------|
| Učební pavilon   | Obvodová stěna    | Severní fasáda           | 98,5        | cihla 450 mm + EPS 120 mm        | zatepleno    | výměna oken 2020    |
| Učební pavilon   | Střecha plochá    | Nad 2. NP                | 312,0       | ŽB panel + EPS 200 mm            | zatepleno    | původní atika       |
| Kuchyně+jídelna  | Obvodová stěna    | Východní fasáda          | 54,2        | cihelné zdivo 300 mm + EPS 100 mm| zatepleno    | zatepleno 2012      |
| Tělocvična       | Střecha šikmá     | Kompletní plocha         | 410,6       | trámová, zatepl. MW 180 mm       | původní      | doporučit zateplení |
| Učební pavilon   | Okna plastová     | všechny fasády           | 38,7        | plastový rám, izolační dvojsklo  | vyměněno     | orientace J+S       |
| Učební pavilon   | Podlaha na terénu | pod přízemím             | 215,4       | beton 150 mm + EPS 80 mm         | původní      | část bez izolace    |

---

## 6. Nejčastější nedostatky a jak je řešit

- **Chybějící nebo nečitelné kóty:** Použij měřítko a známé rozměry stavebních prvků.
- **Nejasná skladba konstrukce:** Doplň podle typických konstrukcí pro dané období/typ budovy, nebo konzultuj s projektantem.
- **Neúplné hodnoty U:** Dopočítej podle skladby nebo použij tabulkové hodnoty z norem (např. ČSN 730540-2).

---

## 7. Doporučené workflow

1. Proveď OCR a označ problematické části skenů.
2. Rozděl objekt na zóny a pro každou si připrav pracovní list.
3. Postupně měř délky a plochy konstrukcí dle zón, vše eviduj.
4. Vyplň skladby, U hodnoty a stav zateplení dle projektové dokumentace nebo typických řešení.
5. Výslednou tabulku použij jako podklad pro výpočty tepelných ztrát nebo návrh opatření.

---

> **Tip:**  
> Pokud narazíš na nejasnosti, vše si zapisuj do „Poznámka“ a později ověř s projektantem, energetikem nebo při místním šetření.

---