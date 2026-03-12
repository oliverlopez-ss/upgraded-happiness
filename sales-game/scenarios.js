const SCENARIOS = [
    // ===== SCENARIO 1: Kallringning =====
    {
        title: "Kallringningen",
        description: "Du ringer ett kallt samtal till en potentiell kund. Ditt mål är att boka ett möte med beslutsfattaren.",
        customer: {
            name: "Anna Lindström",
            company: "TechNova AB",
            role: "IT-chef",
            info: "Medelstort techbolag med 200 anställda. Har idag en föråldrad lösning."
        },
        maxScore: 75,
        steps: [
            {
                type: "choice",
                customerDialogue: "TechNova, Anna Lindström.",
                prompt: "Hur inleder du samtalet?",
                choices: [
                    {
                        text: "Hej Anna! Jag heter [namn] och ringer från [företag]. Jag vet att du har mycket att göra, så jag ska vara kort. Jag har sett att TechNova växer snabbt och ville höra hur ni hanterar [relevant utmaning] idag?",
                        points: 20,
                        feedback: "Utmärkt! Du var respektfull mot hennes tid, visade att du gjort research och ställde en öppen fråga.",
                        tip: "Att visa att du känner till kundens situation bygger förtroende direkt."
                    },
                    {
                        text: "Hej! Jag ringer från [företag] och vi har en fantastisk produkt som jag vill berätta om. Har du tid?",
                        points: 5,
                        feedback: "Du gick rakt på produkten utan att visa intresse för kundens behov. Det gör det lätt att tacka nej.",
                        tip: "Börja alltid med kunden, inte med din produkt. Ställ en fråga som visar att du gjort research."
                    },
                    {
                        text: "Hej Anna, vi har hjälpt liknande bolag som TechNova att spara 30% på sina IT-kostnader. Jag vill gärna förstå hur ni jobbar idag – har du två minuter?",
                        points: 15,
                        feedback: "Bra approach! Du nämnde ett relevant resultat och var konkret med tidsåtgången. Lite mer personlig touch hade gjort det ännu bättre.",
                        tip: "Kombinera social proof med genuin nyfikenhet om kundens situation."
                    }
                ]
            },
            {
                type: "dialogue-tree",
                customerDialogue: "Jag har egentligen inte tid just nu, vi har fullt upp med ett stort projekt.",
                prompt: "Hur hanterar du invändningen?",
                options: [
                    {
                        text: "Jag förstår helt, det låter som ni har mycket på gång. Kan jag ställa en enda kort fråga – är [specifik utmaning] något ni stöter på i ert projekt?",
                        points: 10,
                        response: "Hmm, ja faktiskt. Vi brottas med det hela tiden. Men vi har inte tid att titta på nya lösningar just nu.",
                        feedback: "Bra! Du visade empati och ställde en relevant fråga som fick henne att öppna sig.",
                        followUp: {
                            prompt: "Hon visar intresse men säger att de inte har tid. Vad gör du?",
                            options: [
                                {
                                    text: "Det är precis därför jag ringer – vi hjälper er lösa det utan att ta tid från ert projekt. Kan vi boka 20 minuter nästa vecka när det passar er bättre?",
                                    points: 15,
                                    feedback: "Perfekt! Du kopplade deras utmaning till din lösning och föreslog ett konkret nästa steg.",
                                    response: "Okej, nästa tisdag kanske... Skicka en inbjudan till mig.",
                                    tip: "Att föreslå en specifik tid och kort möte sänker tröskeln."
                                },
                                {
                                    text: "Jag förstår. Kan jag skicka lite material via mejl så kan du titta när du har tid?",
                                    points: 5,
                                    feedback: "Att skicka material är svagt. Det hamnar i papperskorgen. Boka alltid ett möte istället.",
                                    response: "Visst, skicka över.",
                                    tip: "Material via mejl konverterar sällan. Sikta alltid på ett möte."
                                }
                            ]
                        }
                    },
                    {
                        text: "Okej, jag förstår. Jag ringer tillbaka en annan dag!",
                        points: 2,
                        feedback: "Du gav upp för lätt. En invändning är ofta bara ett test – försök alltid gräva djupare.",
                        tip: "Tolka 'jag har inte tid' som 'jag ser inte värdet ännu'. Hitta deras smärtpunkt."
                    },
                    {
                        text: "Jag lovar att det bara tar 30 sekunder! Vår produkt är verkligen bra...",
                        points: 0,
                        feedback: "Du ignorerade hennes invändning och pushade vidare. Det skapar irritation, inte förtroende.",
                        response: "Nej tack, jag måste gå nu. Hejdå.",
                        tip: "Lyssna alltid på kundens invändning. Visa empati innan du försöker styra samtalet."
                    }
                ]
            },
            {
                type: "freetext",
                customerDialogue: "Okej, jag kan ge dig en minut. Vad gör ert företag egentligen?",
                prompt: "Ge en kort och övertygande pitch (elevator pitch) om din lösning.",
                placeholder: "Skriv din elevator pitch här...",
                hint: "Tips: En bra pitch fokuserar på kundens problem, inte dina features. Inkludera: problem, lösning, resultat.",
                evaluation: {
                    basePoints: 3,
                    maxPoints: 25,
                    keywords: [
                        { term: ["problem", "utmaning", "smärtpunkt"], bonus: 4, label: "Problemfokus" },
                        { term: ["spara", "effektiv", "snabbare", "tid"], bonus: 3, label: "Värdeargument" },
                        { term: ["resultat", "roi", "procent", "%"], bonus: 4, label: "Konkreta resultat" },
                        { term: ["liknande bolag", "kunder som", "andra i er bransch"], bonus: 3, label: "Social proof" },
                        { term: ["möte", "demo", "visa", "träffas"], bonus: 3, label: "Call to action" },
                        { term: ["er", "ni", "du", "ert"], bonus: 2, label: "Kundfokus" }
                    ],
                    feedbackGreat: "Fantastisk pitch! Du fokuserade på kundens behov och var konkret med värdet.",
                    feedbackGood: "Bra pitch! Du hade flera viktiga element med.",
                    feedbackOk: "Pitchen kan förbättras. Fokusera mer på kundens problem och konkret värde.",
                    tip: "En stark pitch följer formeln: Vi hjälper [målgrupp] som har [problem] att [resultat] genom [lösning]."
                }
            }
        ]
    },

    // ===== SCENARIO 2: Behovsanalys =====
    {
        title: "Behovsanalysen",
        description: "Du har fått ett första möte med kunden. Nu gäller det att ställa rätt frågor och förstå deras verkliga behov.",
        customer: {
            name: "Marcus Ek",
            company: "Bygg & Montage Sverige AB",
            role: "VD",
            info: "Byggföretag med 80 anställda. Omsätter 120 MSEK. Har problem med projekthantering."
        },
        maxScore: 80,
        steps: [
            {
                type: "choice",
                customerDialogue: "Välkommen! Vi har pratat lite internt och det finns definitivt intresse. Berätta vad ni kan göra för oss.",
                prompt: "Hur börjar du mötet?",
                choices: [
                    {
                        text: "Tack Marcus! Innan jag berättar om oss vill jag gärna förstå er situation bättre. Kan du berätta hur ni hanterar era projekt idag?",
                        points: 25,
                        feedback: "Perfekt! Du lyssnade istället för att prata. De bästa säljarna ställer frågor först.",
                        tip: "Regeln: 80% lyssna, 20% prata i en behovsanalys."
                    },
                    {
                        text: "Absolut! Vi har en komplett plattform som löser alla era behov. Låt mig visa en presentation.",
                        points: 5,
                        feedback: "Du hoppade rakt till presentationen utan att förstå behoven. Det gör din pitch generisk.",
                        tip: "Förstå alltid kundens specifika behov innan du presenterar. Annars riskerar du att prata om fel saker."
                    },
                    {
                        text: "Tack! Jag har förberett några frågor. Men först – vad fick er att tacka ja till det här mötet? Vad hoppas ni få ut av det?",
                        points: 20,
                        feedback: "Bra! Att fråga om deras förväntningar visar professionalitet och hjälper dig styra mötet.",
                        tip: "Att fråga 'varför tog ni mötet?' avslöjar ofta deras verkliga smärtpunkt."
                    }
                ]
            },
            {
                type: "dialogue-tree",
                customerDialogue: "Vi använder mest Excel och mejl för att hålla koll på projekten. Det funkar... okej. Men vi missar ibland deadlines och budgetar spricker.",
                prompt: "Vilken fråga ställer du för att gräva djupare?",
                options: [
                    {
                        text: "Kan du ge mig ett konkret exempel på ett projekt där budget eller deadline sprack? Vad hände och vad blev konsekvenserna?",
                        points: 20,
                        response: "Ja, förra kvartalet hade vi ett projekt som gick 400 000 kr över budget. Vi upptäckte det för sent. Kunden blev missnöjd och vi fick ta smällen.",
                        feedback: "Utmärkt fråga! Genom att be om ett konkret exempel får du fakta att bygga din lösning kring.",
                        tip: "Konkreta exempel gör smärtan verklig och mätbar. '400 000 kr' är ett kraftfullt argument senare."
                    },
                    {
                        text: "Hur ofta händer det att budgetar spricker?",
                        points: 10,
                        response: "Kanske vartannat projekt ungefär. Det är frustrerande.",
                        feedback: "Okej fråga, men du kunde gå djupare. Fråga om konsekvenser och känslor, inte bara frekvens.",
                        tip: "Bra frågor avslöjar konsekvenser: 'Vad händer när...?' 'Hur påverkar det...?'"
                    },
                    {
                        text: "Jag förstår! Vår plattform löser precis det problemet. Ska jag visa hur?",
                        points: 3,
                        response: "Ehm, okej...",
                        feedback: "Du avbröt behovsanalysen alldeles för tidigt. Du vet fortfarande inte tillräckligt.",
                        tip: "Motstå frestelsen att pitcha för tidigt. Varje fråga du ställer ger dig ammunition för din presentation."
                    }
                ]
            },
            {
                type: "freetext",
                customerDialogue: "Det kostar oss mycket pengar och tid. Men jag vet inte riktigt vad lösningen är.",
                prompt: "Skriv 2-3 fördjupande frågor du skulle ställa för att förstå problemet bättre.",
                placeholder: "Skriv dina frågor här...",
                hint: "Bra behovsfrågor är öppna och utforskande. Undvik ja/nej-frågor.",
                evaluation: {
                    basePoints: 5,
                    maxPoints: 30,
                    keywords: [
                        { term: ["hur", "berätta", "beskriv"], bonus: 3, label: "Öppna frågor" },
                        { term: ["kostnad", "pengar", "budget", "kr"], bonus: 3, label: "Ekonomisk impact" },
                        { term: ["tid", "timmar", "veckor"], bonus: 2, label: "Tidsaspekt" },
                        { term: ["anställda", "team", "medarbetare", "projektledare"], bonus: 3, label: "Människoperspektiv" },
                        { term: ["idag", "nuvarande", "just nu"], bonus: 2, label: "Nulägesanalys" },
                        { term: ["önskar", "helst", "dröm", "ideal", "vill"], bonus: 3, label: "Framtidsvision" },
                        { term: ["beslutsfattare", "beslut", "vem bestämmer"], bonus: 3, label: "Beslutsprocess" },
                        { term: ["konkurrent", "alternativ", "andra leverantörer"], bonus: 2, label: "Konkurrensanalys" }
                    ],
                    feedbackGreat: "Fantastiska frågor! Du täckte flera viktiga dimensioner av problemet.",
                    feedbackGood: "Bra frågor! Du började gräva på djupet.",
                    feedbackOk: "Försök ställa mer öppna och utforskande frågor som avslöjar den verkliga smärtan.",
                    tip: "De bästa frågorna utforskar: 1) Problemets storlek (pengar/tid), 2) Vem som påverkas, 3) Vad drömläget ser ut, 4) Beslutsprocessen."
                }
            }
        ]
    },

    // ===== SCENARIO 3: Invändningshantering =====
    {
        title: "Invändningshanteringen",
        description: "Du har presenterat din lösning och kunden är intresserad – men nu kommer invändningarna. Kan du hantera dem?",
        customer: {
            name: "Sofia Berg",
            company: "MediaPuls AB",
            role: "Marknadschef",
            info: "Digitalbyrå med 50 anställda. Letar efter en ny CRM-lösning. Budget är en känslig fråga."
        },
        maxScore: 85,
        steps: [
            {
                type: "dialogue-tree",
                customerDialogue: "Det ser bra ut, men det är för dyrt. Vi har inte budget för det här just nu.",
                prompt: "Hur hanterar du prisinvändningen?",
                options: [
                    {
                        text: "Jag förstår att priset är en viktig faktor. Hjälp mig förstå – när du säger 'för dyrt', jämför du med något annat, eller är det den totala investeringen som känns stor?",
                        points: 15,
                        response: "Det är nog mer att vi inte hade planerat för den här utgiften. Det är svårt att motivera internt.",
                        feedback: "Utmärkt! Du grävde i invändningen istället för att direkt sänka priset.",
                        followUp: {
                            prompt: "Nu vet du att det handlar om intern motivering, inte priset i sig. Vad gör du?",
                            options: [
                                {
                                    text: "Då föreslår jag att vi bygger ett business case tillsammans. Om ni tappar X kunder per månad på grund av nuvarande system, vad kostar det er? Ofta visar det sig att vår lösning betalar sig inom 6 månader.",
                                    points: 15,
                                    feedback: "Perfekt! Du hjälpte henne sälja internt genom att bygga ett ROI-argument.",
                                    response: "Det är faktiskt smart. Kan du hjälpa mig sätta ihop något jag kan visa ledningen?",
                                    tip: "Hjälp alltid kunden att motivera köpet internt. Du säljer inte till en person – du säljer till en organisation."
                                },
                                {
                                    text: "Vi kan erbjuda 20% rabatt om ni bestämmer er denna vecka.",
                                    points: 5,
                                    feedback: "Rabatt borde vara sista utvägen, inte första. Du sänkte ditt eget värde.",
                                    response: "Det låter bättre, men jag måste fortfarande kolla med ledningen.",
                                    tip: "Rabatter sänker din trovärdighet och marginal. Bygg värde istället."
                                }
                            ]
                        }
                    },
                    {
                        text: "Jag hör dig. Vad är er budget? Kanske kan vi anpassa ett paket.",
                        points: 8,
                        response: "Vi hade tänkt runt halva den summan.",
                        feedback: "Att fråga om budget tidigt är okej, men du riskerar att förhandla mot dig själv.",
                        tip: "Bygg värdet av lösningen innan du diskuterar pris. Priset ska sättas i relation till problemets kostnad."
                    },
                    {
                        text: "Okej, jag förstår. Ska jag återkomma nästa kvartal istället?",
                        points: 2,
                        feedback: "Du accepterade invändningen rakt av. 'För dyrt' betyder sällan att de inte har pengar – det betyder att de inte ser värdet.",
                        tip: "Acceptera aldrig en invändning utan att utforska den. Det finns nästan alltid mer under ytan."
                    }
                ]
            },
            {
                type: "choice",
                customerDialogue: "En annan sak – vi tittade på [konkurrent] också. De verkar ha liknande funktioner. Varför ska vi välja er?",
                prompt: "Hur positionerar du dig mot konkurrenten?",
                choices: [
                    {
                        text: "Bra att ni jämför! Istället för att prata om dem, låt mig fråga: vilka tre saker är viktigast för er i den här lösningen? Då kan jag visa hur vi levererar på just det.",
                        points: 25,
                        feedback: "Utmärkt strategi! Du undvek att tala illa om konkurrenten och vände det till att fokusera på kundens behov.",
                        tip: "Prata aldrig negativt om konkurrenter. Styr istället fokus till kundens specifika krav."
                    },
                    {
                        text: "De är billigare men deras support är usel och produkten kraschar hela tiden.",
                        points: 3,
                        feedback: "Att prata negativt om konkurrenter är oprofessionellt och skadar ditt förtroende.",
                        tip: "Negativt om konkurrenter = negativt om dig. Fokusera på dina styrkor, inte andras svagheter."
                    },
                    {
                        text: "Vi har fler funktioner, bättre integration och snabbare support. Här är en jämförelsetabell.",
                        points: 12,
                        feedback: "En feature-jämförelse kan fungera men gör er lätt utbytbar. Bättre att fokusera på specifikt kundvärde.",
                        tip: "Features kopieras lätt. Fokusera på hur din lösning löser kundens specifika problem bättre."
                    }
                ]
            },
            {
                type: "freetext",
                customerDialogue: "Jag gillar det ni erbjuder, men jag måste prata med min VD först. Han är ganska skeptisk till nya system.",
                prompt: "Hur hjälper du Sofia att övertyga sin VD? Skriv vad du skulle säga.",
                placeholder: "Skriv ditt svar...",
                hint: "Tänk på: Vad behöver en VD höra? Hur kan du hjälpa Sofia sälja internt?",
                evaluation: {
                    basePoints: 5,
                    maxPoints: 30,
                    keywords: [
                        { term: ["roi", "avkastning", "investering", "betalar sig"], bonus: 4, label: "ROI-argument" },
                        { term: ["siffror", "data", "resultat", "procent", "%"], bonus: 3, label: "Konkreta siffror" },
                        { term: ["tillsammans", "hjälpa", "stödja", "material"], bonus: 3, label: "Samarbete" },
                        { term: ["möte", "presentation", "träffa", "demo"], bonus: 4, label: "Nästa steg" },
                        { term: ["risk", "garanti", "test", "pilot"], bonus: 3, label: "Riskminimering" },
                        { term: ["vd", "ledning", "beslutsfattare"], bonus: 2, label: "Beslutsfattarfokus" }
                    ],
                    feedbackGreat: "Utmärkt! Du hjälpte Sofia med argument och tog ansvar för nästa steg.",
                    feedbackGood: "Bra ansats! Du visade vilja att hjälpa henne sälja internt.",
                    feedbackOk: "Fundera på hur du konkret kan hjälpa Sofia övertyga sin VD med siffror och ROI.",
                    tip: "Bästa strategin: 1) Erbjud att ta fram ROI-underlag, 2) Föreslå ett kort möte med VD, 3) Minska risken med pilot/garanti."
                }
            }
        ]
    },

    // ===== SCENARIO 4: Förhandling & Closing =====
    {
        title: "Förhandlingen & Closing",
        description: "Kunden är redo att köpa men vill förhandla. Kan du stänga affären på bra villkor?",
        customer: {
            name: "Erik Johansson",
            company: "LogiFlow AB",
            role: "Inköpschef",
            info: "Logistikföretag med 300 anställda. Har valt er som slutkandidat. Priset: 450 000 kr/år."
        },
        maxScore: 90,
        steps: [
            {
                type: "dialogue-tree",
                customerDialogue: "Vi gillar er lösning bäst, men priset måste ner. Kan ni gå ner till 350 000?",
                prompt: "Erik vill ha 22% rabatt. Hur hanterar du det?",
                options: [
                    {
                        text: "Jag uppskattar att ni valt oss! 350 000 är svårt att nå, men hjälp mig förstå – om priset var rätt, är ni redo att signera?",
                        points: 15,
                        response: "Ja, om vi landar på rätt pris och villkor så är vi redo att gå vidare.",
                        feedback: "Smart! Du bekräftade köpintentionen innan du förhandlade. Nu vet du att pris är enda hindret.",
                        followUp: {
                            prompt: "Han bekräftade att de vill köpa. Hur lägger du ditt motbud?",
                            options: [
                                {
                                    text: "Jag kan inte gå till 350, men om ni tecknar ett 2-årsavtal kan jag erbjuda 420 000/år. Då får ni även prioriterad support och onboarding utan extra kostnad.",
                                    points: 20,
                                    feedback: "Briljant! Du sänkte inte priset utan ökade värdet och förlängde avtalet. Alla vinner.",
                                    response: "2-årsavtal med prioriterad support... Det låter faktiskt rimligt. Jag ska ta det till ledningen.",
                                    tip: "Förhandlingsregel: Ge aldrig rabatt utan att få något tillbaka (längre avtal, fler licenser, referens)."
                                },
                                {
                                    text: "Vi kan mötas på mitten – 400 000 kr/år. Det är det bästa jag kan göra.",
                                    points: 10,
                                    feedback: "Att mötas på mitten är vanligt men du gav bort 50 000 utan att få något tillbaka.",
                                    response: "400 000... kan vi inte landa på 380?",
                                    tip: "Ge aldrig rabatt gratis. Koppla alltid en eftergift till ett motvillkor."
                                }
                            ]
                        }
                    },
                    {
                        text: "350 000? Absolut, vi kan ordna det!",
                        points: 2,
                        feedback: "Du accepterade direkt utan förhandling! Nu undrar kunden om du överprisade från start.",
                        response: "Bra... men kan vi kanske diskutera ytterligare rabatt vid fler licenser?",
                        tip: "Att ge rabatt direkt signalerar att ditt ordinarie pris inte var ärligt."
                    },
                    {
                        text: "Tyvärr, 450 000 är vårt pris. Vi kan inte göra avdrag.",
                        points: 5,
                        feedback: "Att vara helt oflexibel riskerar att döda affären. Förhandling handlar om att hitta lösningar, inte att vinna.",
                        response: "Hmm, då kanske vi får titta på alternativen igen...",
                        tip: "Var flexibel men strategisk. Det finns alltid sätt att skapa värde utan att sänka priset."
                    }
                ]
            },
            {
                type: "choice",
                customerDialogue: "Okej, vi är nästan där. Men jag vill tänka på det över helgen.",
                prompt: "'Jag vill tänka på det' – hur reagerar du?",
                choices: [
                    {
                        text: "Självklart! Innan du går – finns det något specifikt du behöver fundera på? Jag vill säkerställa att du har all information du behöver.",
                        points: 25,
                        feedback: "Perfekt! Du respekterade hans behov men avslöjade eventuella dolda invändningar.",
                        tip: "'Jag vill tänka på det' döljer ofta en specifik oro. Hitta den!"
                    },
                    {
                        text: "Okej, ta din tid! Jag ringer dig på måndag.",
                        points: 8,
                        feedback: "Du lät kunden gå utan att förstå vad de funderar på. Risken ökar att affären dör.",
                        tip: "Varje gång kunden 'ska tänka' utan att du vet på vad – minskar chansen att affären stängs."
                    },
                    {
                        text: "Jag förstår, men vi har ett erbjudande som gäller bara denna vecka. Om du skriver på idag...",
                        points: 5,
                        feedback: "Artificiell brådska genomskådas lätt och skadar förtroendet.",
                        tip: "Sann brådska (t.ex. prisökningar, kapacitetsbegränsningar) fungerar. Falsk brådska förstör relationer."
                    }
                ]
            },
            {
                type: "freetext",
                customerDialogue: "Du har rätt, det finns en sak. Min VD tycker det är riskabelt att byta system mitt i högsäsong. Vi vill inte att det påverkar leveranserna.",
                prompt: "Hur adresserar du oron kring risk och implementeringstid? Skriv ditt svar.",
                placeholder: "Skriv hur du hanterar riskoron...",
                hint: "Tänk på: Hur minimerar du risk? Konkreta åtgärder? Garantier?",
                evaluation: {
                    basePoints: 5,
                    maxPoints: 30,
                    keywords: [
                        { term: ["parallellt", "parallell", "stegvis", "fas"], bonus: 4, label: "Stegvis implementation" },
                        { term: ["pilot", "test", "prov"], bonus: 4, label: "Pilotprojekt" },
                        { term: ["garanti", "nöjd", "avbryt", "riskfri"], bonus: 3, label: "Garanti/riskfritt" },
                        { term: ["support", "hjälp", "dedikerad", "kontaktperson"], bonus: 3, label: "Supportlöfte" },
                        { term: ["plan", "tidsplan", "schema"], bonus: 3, label: "Tydlig plan" },
                        { term: ["referens", "andra kunder", "liknande"], bonus: 3, label: "Kundreferenser" },
                        { term: ["leverans", "högsäsong", "påverka"], bonus: 2, label: "Adresserar specifik oro" }
                    ],
                    feedbackGreat: "Utmärkt! Du adresserade risken med konkreta åtgärder och minimerade osäkerheten.",
                    feedbackGood: "Bra svar! Du visade förståelse för deras oro.",
                    feedbackOk: "Fundera på mer konkreta sätt att minimera risken – pilot, stegvis, garantier.",
                    tip: "Bästa sätt att hantera risk: 1) Stegvis implementation, 2) Pilot/test, 3) Garanti, 4) Referenskunder som gjort samma resa."
                }
            }
        ]
    },

    // ===== SCENARIO 5: Uppföljning & Merförsäljning =====
    {
        title: "Uppföljningen & Merförsäljning",
        description: "Kunden har varit aktiv i 6 månader. Nu är det dags för uppföljning – och kanske merförsäljning.",
        customer: {
            name: "Linda Norén",
            company: "GreenTech Solutions AB",
            role: "COO",
            info: "Hållbarhetsföretag med 120 anställda. Använder ert system sedan 6 månader. Nöjda men använder bara grundpaketet."
        },
        maxScore: 70,
        steps: [
            {
                type: "choice",
                customerDialogue: "Hej! Kul att du hör av dig. Vi är nöjda med systemet, allt funkar bra.",
                prompt: "Kunden är nöjd. Hur öppnar du upp för mer?",
                choices: [
                    {
                        text: "Kul att höra! Jag har tittat på er användning och ser att ni framför allt använder [X] och [Y]. Finns det utmaningar ni stöter på i ert dagliga arbete som systemet inte löser idag?",
                        points: 20,
                        feedback: "Perfekt! Du visade att du följer deras användning och ställde en utforskande fråga.",
                        tip: "Datadrivet: Visa att du har koll på deras situation. Det bygger förtroende."
                    },
                    {
                        text: "Bra! Vi har lanserat en ny Premium-modul. Den kostar 50 000 kr extra per år. Vill du testa?",
                        points: 5,
                        feedback: "Du hoppade direkt till försäljning utan att förstå deras behov. Det känns påträngande.",
                        tip: "Merförsäljning ska baseras på identifierade behov, inte på din produktlansering."
                    },
                    {
                        text: "Vad bra! Hur har implementeringen påverkat ert team? Har ni sett förbättringar i [specifik KPI]?",
                        points: 15,
                        feedback: "Bra! Du utforskade resultatet av ert samarbete, vilket bygger värde och öppnar för utveckling.",
                        tip: "Att kvantifiera kundens vinst gör det lättare att motivera nästa steg."
                    }
                ]
            },
            {
                type: "dialogue-tree",
                customerDialogue: "Nu när du säger det – vi har växt mycket senaste halvåret och har fler projektledare nu. Det börjar bli rörigt med behörigheter och rapporter.",
                prompt: "Linda avslöjar ett nytt behov. Hur tar du det vidare?",
                options: [
                    {
                        text: "Det låter som en typisk tillväxtutmaning – grattis till tillväxten! Berätta mer: hur många projektledare har ni nu, och vad är det som blir rörigt? Jag vill förstå detaljerna.",
                        points: 15,
                        response: "Vi har gått från 5 till 12 projektledare. Det är svårt att ha koll på vem som gör vad och vi saknar bra rapportering uppåt.",
                        feedback: "Utmärkt! Du visade intresse, ställde fördjupande frågor och lät henne prata.",
                        followUp: {
                            prompt: "Nu har du identifierat problemet. Hur kopplar du det till din lösning?",
                            options: [
                                {
                                    text: "Det är precis det vår Team Management-modul löser. Med rollbaserade behörigheter och dashboards för ledningen. Ska jag sätta upp en demo anpassad för era 12 projektledare?",
                                    points: 15,
                                    feedback: "Perfekt! Du kopplade deras specifika behov till en konkret lösning med ett tydligt nästa steg.",
                                    response: "Ja, det vore jättebra! Kan vi göra det nästa vecka?",
                                    tip: "Merförsäljning som baseras på verkliga behov känns som hjälp, inte sälj."
                                },
                                {
                                    text: "Vi har ett premium-paket som inkluderar allt det där och mycket mer. Jag skickar en offert!",
                                    points: 5,
                                    feedback: "Att skicka en offert utan demo eller djupare diskussion är för tidigt.",
                                    response: "Hmm, skicka över så tittar jag.",
                                    tip: "Offerter utan kontext hamnar i papperskorgen. Boka alltid ett möte först."
                                }
                            ]
                        }
                    },
                    {
                        text: "Vi har en modul för det! Den kostar 4 000 kr/mån extra. Vill du lägga till den?",
                        points: 3,
                        response: "Eh, det var snabbt. Jag får tänka på det.",
                        feedback: "Du gick direkt till pris utan att utforska behovet. Det känns som försäljning, inte rådgivning.",
                        tip: "Utforska alltid behovet fullt innan du nämner pris. Ju mer du förstår, desto mer relevant blir ditt erbjudande."
                    }
                ]
            },
            {
                type: "freetext",
                customerDialogue: "En sak till – vi funderar på att byta CRM till en konkurrent. Deras säljare var här förra veckan. Vad tycker du?",
                prompt: "Kunden överväger att lämna er för en konkurrent! Skriv hur du hanterar situationen.",
                placeholder: "Skriv ditt svar...",
                hint: "Tips: Bli inte defensiv. Fokusera på värde, relation och att förstå vad som lockar hos konkurrenten.",
                evaluation: {
                    basePoints: 5,
                    maxPoints: 30,
                    keywords: [
                        { term: ["varför", "vad lockar", "vad saknar", "anledning"], bonus: 4, label: "Utforskande fråga" },
                        { term: ["integration", "system", "sammankoppl"], bonus: 3, label: "Integrationsvärde" },
                        { term: ["relation", "samarbete", "partner"], bonus: 3, label: "Relationsargument" },
                        { term: ["kostnad", "byte", "implementation", "tid"], bonus: 3, label: "Byteskostnad" },
                        { term: ["möte", "diskutera", "gå igenom"], bonus: 3, label: "Nästa steg" },
                        { term: ["data", "historik", "använ"], bonus: 2, label: "Befintligt värde" },
                        { term: ["förbättr", "utveckla", "anpass"], bonus: 3, label: "Vilja att förbättra" }
                    ],
                    feedbackGreat: "Utmärkt krishantering! Du var professionell, utforskande och proaktiv.",
                    feedbackGood: "Bra ansats! Du visade intresse för att förstå situationen.",
                    feedbackOk: "Undvik att bli defensiv. Fråga vad som lockar och visa vilja att förbättra ert samarbete.",
                    tip: "Vid churn-risk: 1) Fråga varför (utan att vara defensiv), 2) Påminn om befintligt värde, 3) Visa vilja att anpassa, 4) Boka ett uppföljningsmöte snabbt."
                }
            }
        ]
    }
];
