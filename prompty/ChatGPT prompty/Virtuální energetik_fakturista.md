## Virtuální energetik



#### **FAKTURISTA**





#### Workflow pro systematické zpracování faktur do ChatGPT

##### 

###### 1\) OCR převod naskenovaných faktur v jednom souboru



    - Otevři fakturu v PDF-XChange Editoru.

    - Pomocí funkce OCR (Rozpoznat text/OCR Tool) na záložce Konverze převeď soubor na textově rozpoznané PDF.

    - Pokud je soubor dlouhý (více než 8 stran), rozděl jej na menší bloky, aby šly nahrát po částech (ideální velikost jednoho bloku je max. 8 stran).

    - Každý blok si ulož pod názvem, např. „Faktura\_OM1\_část1.txt“, „Faktura\_OM1\_část2.txt“, atd.



###### 2\) Postupné vkládání do ChatGPT



    - Otevři chat s připraveným promptem „Fakturista“ (viz níže).

    - Nahraj první část textu a požádej ChatGPT, aby počkal na další bloky a tabulku vytvořil až po nahrání všech částí.

    - Pokračuj v nahrávání všech částí, vždy označ, o jaký blok se jedná (např. „část 2 z 5“).



###### 3\) Výstup – spojení tabulek



    - Po poslední části požádej ChatGPT o „výslednou konsolidovanou tabulku za všechny části“, vhodnou pro export do Excelu.





##### Celý prompt na začátek (včetně workflow):



Následující faktury jsou naskenované a prošly OCR v programu PDF-XChange Editor.

Vzhledem k jejich délce je rozděluji na více částí (každá část je samostatný blok textu z OCR, části na sebe navazují).



Prosím, zpracovávej údaje z jednotlivých bloků postupně a tabulku vygeneruj až po nahrání všech částí (každou část ti označím jako „část X z Y“). Po poslední části mi napiš „Vše načteno, zde je tabulka za celý soubor“ a vyplň celou přehlednou tabulku, ve které bude:



    - Komodita (teplo, zemní plyn, elektřina, voda)

    - Odběrné místo (název/adresa/EAN/EIC/číslo OM)

    - Období (měsíc, rok)

    - Spotřeba celkem \[kWh, m³, GJ, m³ vody]

    - Spotřeba ve VT a NT (pokud je na faktuře)

    - Komoditní složka ceny \[Kč]

    - Distribuční složka ceny \[Kč]

    - Další poplatky a daně \[Kč]

    - Celková cena \[Kč]



Pokud faktura neobsahuje některé položky, pole nech prázdné, případně mě upozorni.

Výstup generuj do tabulky (Markdown, pro snadné zkopírování do Excelu).



Vstupní data budu vkládat po částech, začni načítat první blok.

