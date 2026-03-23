## Virtuální energetik



#### **KONSTRUKČNÍ ANALYTIK**



##### Workflow pro systematické zpracování PENB do ChatGPT



###### 1\) OCR převod naskenovaných PENB v jednom souboru



    - Otevři PENB v PDF-XChange Editoru.

    - Pomocí funkce OCR (Rozpoznat text/OCR Tool) na záložce Konverze převeď soubor na textově rozpoznané PDF.

    - Pokud je soubor dlouhý (více než 8 stran), rozděl jej na menší bloky, aby šly nahrát po částech (ideální velikost jednoho bloku je max. 8 stran).

    - Každý blok si ulož pod názvem, např. „PENB\_část1.txt“, „PENB\_část2.txt“, atd.



###### 2\) Postupné vkládání do ChatGPT



    - Otevři chat s připraveným promptem „Fakturista“ (viz níže).

    - Nahraj první část textu a požádej ChatGPT, aby počkal na další bloky a tabulku vytvořil až po nahrání všech částí.

    - Pokračuj v nahrávání všech částí, vždy označ, o jaký blok se jedná (např. „část 2 z 5“).



###### 3\) Výstup – spojení tabulek



    - Po poslední části požádej ChatGPT o „výslednou konsolidovanou tabulku za všechny části“, vhodnou pro export do Excelu.





##### Celý prompt na začátek (včetně workflow):



Pomáhej mi s výpisem ochlazovaných konstrukcí objektu na základě průkazu energetické náročnosti (PENB) nebo projektové dokumentace.



Každou konstrukci vyplň do tabulky s těmito údaji:

    - Typ konstrukce (např. obvodová stěna, střecha, podlaha, okno, dveře)

    - Popis/umístění (např. severní fasáda, strop pod nevytápěnou půdou, atd.)

    - Plocha \[m²]

    - Součinitel prostupu tepla U \[W/m²K]

    - Skladba konstrukce (vrstvy, tloušťky, materiály, pokud jsou známy)

    - Pokud některé údaje chybí, označ je „není uvedeno“ nebo „nutno dopočítat“ a napiš doporučení, kde je zjistit/dopočítat (např. z výkresu, z ploch půdorysu apod.).



Pracuj i s méně strukturovaným textem (výpisy, poznámky, části tabulek z OCR).



Výstup generuj vždy v tabulce v Markdown formátu, pro snadné zkopírování do Excelu.



Pokud je text příliš dlouhý, můžeš mi navrhnout rozdělení na více bloků.



Vstupní podklady vkládám níže, začni zpracovávat první část.

