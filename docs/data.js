// Fortnite Guide - All guide data
const GUIDE_DATA = {
  categories: [
    {
      id: 'editing',
      title: 'Editing & Byggteknik',
      icon: '🏗️',
      color: '#00d4ff',
      description: 'Lär dig editera väggar, golv och tak som ett proffs',
      guides: [
        {
          id: 'wall-edits',
          title: 'Vägg-edits',
          difficulty: 'Nybörjare',
          isPremium: false,
          icon: '🧱',
          content: [
            {
              type: 'intro',
              text: 'Att kunna editera väggar snabbt är grundläggande i Fortnite. Här lär du dig alla viktiga vägg-edits.'
            },
            {
              type: 'tip',
              title: 'Window Edit',
              text: 'Ta bort mittenstycket i väggen för att skapa ett fönster. Perfekt för att skjuta igenom utan att exponera hela kroppen.',
              keys: 'Markera mittenrutan → Bekräfta'
            },
            {
              type: 'tip',
              title: 'Door Edit',
              text: 'Ta bort en av de nedre rutorna för att skapa en dörr. Bra för att snabbt ta sig igenom en vägg.',
              keys: 'Markera en nedre ruta → Bekräfta'
            },
            {
              type: 'tip',
              title: 'Half Wall Edit',
              text: 'Ta bort hela övre eller nedre halvan. Används för att snabbt få sikt eller för "peeking".',
              keys: 'Markera övre 3 rutorna → Bekräfta'
            },
            {
              type: 'tip',
              title: 'Triangle Edit (Peanut Butter)',
              text: 'Ta bort hörnet för att skapa en diagonal öppning. Extremt användbart i boxfights!',
              keys: 'Markera 2 diagonala rutor → Bekräfta'
            },
            {
              type: 'pro',
              title: 'Pro-tips för väggedits',
              text: 'Öva alltid på att resetta dina edits direkt efter du skjutit. En öppen edit = du är sårbar. Snabbhet på reset är lika viktig som själva editen.'
            }
          ]
        },
        {
          id: 'floor-edits',
          title: 'Golv-edits',
          difficulty: 'Medel',
          isPremium: false,
          icon: '⬜',
          content: [
            {
              type: 'intro',
              text: 'Golv-edits är viktiga för att röra sig vertikalt och för att överraska motståndare underifrån.'
            },
            {
              type: 'tip',
              title: 'Half Floor',
              text: 'Editera bort halva golvet för att hoppa ner snabbt. Används ofta i kombination med en ramp.',
              keys: 'Markera 2 rutor på en sida → Bekräfta'
            },
            {
              type: 'tip',
              title: 'Corner Floor',
              text: 'Ta bort ett hörn av golvet. Bra för att droppa ner oväntat i boxfights.',
              keys: 'Markera 1 ruta → Bekräfta'
            },
            {
              type: 'pro',
              title: 'Combo: Floor + Ramp',
              text: 'Editera golvet och placera en ramp i samma rörelse. Detta ger dig höjdövertag samtidigt som du rör dig nedåt. Övning krävs!'
            }
          ]
        },
        {
          id: 'roof-edits',
          title: 'Tak-edits (Cone edits)',
          difficulty: 'Avancerad',
          isPremium: true,
          icon: '🔺',
          content: [
            {
              type: 'intro',
              text: 'Cone/tak-edits är det som skiljer bra spelare från riktigt bra spelare. Lär dig dessa för att dominera.'
            },
            {
              type: 'tip',
              title: 'Ramp Cone Edit',
              text: 'Editera taket så det blir en ramp. Perfekt för att snabbt få en extra ramp i din box utan att byta byggverktyg.',
              keys: 'Markera 2 rutor på samma sida → Bekräfta'
            },
            {
              type: 'tip',
              title: 'Corner Cone Edit',
              text: 'Editera bort 3 av 4 rutor. Skapar en liten ramp i hörnet - perfekt för att peka runt hörn.',
              keys: 'Markera 3 rutor → Bekräfta'
            },
            {
              type: 'tip',
              title: 'Mongraal Classic',
              text: 'Placera vägg + golv + trappa inuti boxen, editera väggen, skjut, reset. Den ultimata boxfight-tekniken namngiven efter Mongraal.',
              keys: 'Vägg → Golv → Ramp → Edit vägg → Skjut → Reset'
            },
            {
              type: 'pro',
              title: 'Avancerad: Double Edit',
              text: 'Editera golv + tak (cone) i en snabb följd för att droppa ner genom din egen box. Kräver övning men är otroligt effektivt.'
            }
          ]
        },
        {
          id: 'stair-edits',
          title: 'Trapp-edits & Retakes',
          difficulty: 'Avancerad',
          isPremium: true,
          icon: '📐',
          content: [
            {
              type: 'intro',
              text: 'Trapp-edits och retake-tekniker för att ta tillbaka höjd i byggslagsmål.'
            },
            {
              type: 'tip',
              title: 'Side Jump Retake',
              text: 'Bygg ramp → hoppa åt sidan → placera vägg + golv + ramp. Svårt att kontra om du gör det snabbt.',
              keys: 'Ramp → Hopp → Vägg + Golv + Ramp'
            },
            {
              type: 'tip',
              title: 'Thwifo Classic',
              text: 'Hoppa → placera golv under dig → vänd dig 180° → placera ramp bakom dig. En av de mest effektiva retakes.',
              keys: 'Hopp → Golv → 180° → Ramp'
            },
            {
              type: 'tip',
              title: 'Ramp Flip',
              text: 'Editera din trappa så den vänder riktning. Överraskar motståndare som förväntar sig att du kommer från en sida.',
              keys: 'Markera 2 rutor diagonalt → Bekräfta'
            },
            {
              type: 'pro',
              title: 'Speed tip',
              text: 'Använd scroll wheel för att resetta edits om du spelar på PC. Det är mycket snabbare än att trycka på en knapp.'
            }
          ]
        }
      ]
    },
    {
      id: 'building',
      title: 'Byggteknik',
      icon: '🏰',
      color: '#ff6b35',
      description: 'Från 90s till tunneling - alla byggtekniker du behöver',
      guides: [
        {
          id: '90s',
          title: 'Perfekta 90s',
          difficulty: 'Medel',
          isPremium: false,
          icon: '🔄',
          content: [
            {
              type: 'intro',
              text: '90s är den snabbaste tekniken för att ta höjd. Att kunna göra snabba, rena 90s är grundläggande.'
            },
            {
              type: 'tip',
              title: 'Grundläggande 90',
              text: 'Placera vägg → vänd 90° → placera ramp → hoppa → upprepa. Nyckeln är att hoppa i rätt timing.',
              keys: 'Vägg → 90° sväng → Ramp → Hopp → Upprepa'
            },
            {
              type: 'tip',
              title: 'Protected 90s',
              text: 'Lägg till ett golv i varje 90 för extra skydd. Långsammare men mycket säkrare om motståndaren skjuter.',
              keys: 'Vägg → Golv → 90° sväng → Ramp → Hopp'
            },
            {
              type: 'pro',
              title: 'Vanliga misstag',
              text: '1. Hoppar för sent (du fastnar under rampen)\n2. Svänger för långsamt (tappar momentum)\n3. Placerar inte väggen först (ingen skydd)\n\nÖva i Creative tills det sitter i muskelminnet!'
            }
          ]
        },
        {
          id: 'boxfighting',
          title: 'Boxfighting Masterclass',
          difficulty: 'Avancerad',
          isPremium: true,
          icon: '📦',
          content: [
            {
              type: 'intro',
              text: 'Boxfighting är kärnan i Fortnite-strid. Att kontrollera din box och ta kontroll över motståndarens box är nyckeln till att vinna.'
            },
            {
              type: 'tip',
              title: 'Piece Control',
              text: 'Placera dina egna byggen runt motståndaren. Om DU äger väggarna kan DU editera dem. Försök alltid ta över motståndarens väggar.',
              keys: 'Förstör motståndarens vägg → Bygg din egen → Nu kan du editera'
            },
            {
              type: 'tip',
              title: 'Right Hand Peek',
              text: 'I Fortnite ser din karaktär runt höger sida först. Positionera dig alltid så att motståndaren är till höger om din edit. Detta ger dig fördelen.',
              keys: 'Ställ dig till vänster om din edit → Editera → Skjut'
            },
            {
              type: 'tip',
              title: 'Peanut Butter Edit Play',
              text: 'Editera en triangel i väggen, skjut, stäng direkt. Motståndaren hinner knappt reagera om du gör det snabbt nog.',
              keys: 'Diagonal edit → Skjut → Reset → Upprepa'
            },
            {
              type: 'pro',
              title: 'Avancerad: Bait & Switch',
              text: 'Editera en sida av din box som bete → stäng → editera andra sidan och skjut. Motståndaren fokuserar på fel sida.'
            }
          ]
        },
        {
          id: 'tunneling',
          title: 'Tunneling & Rotation',
          difficulty: 'Avancerad',
          isPremium: true,
          icon: '🚇',
          content: [
            {
              type: 'intro',
              text: 'Tunneling är konsten att röra sig säkert genom öppna ytor genom att bygga runt sig. Kritiskt i endgame.'
            },
            {
              type: 'tip',
              title: 'Grundläggande Tunnel',
              text: 'Golv under dig → vägg framför → ramp ovanför → gå framåt → upprepa. Håll dig alltid skyddad.',
              keys: 'Golv → Vägg → Ramp/Tak → Gå framåt'
            },
            {
              type: 'tip',
              title: 'Side-to-Side Tunnel',
              text: 'Bygg väggar på båda sidorna medan du tunnlar. Ger fullt skydd men kräver snabba händer.',
              keys: 'Golv → Vänster vägg → Höger vägg → Ramp → Framåt'
            },
            {
              type: 'pro',
              title: 'Zone Rotation Tips',
              text: 'Rotera alltid tidigt om möjligt. Spara material genom att använda naturlig terräng. I endgame: tunnla alltid, spring aldrig öppet.'
            }
          ]
        }
      ]
    },
    {
      id: 'combat',
      title: 'Stridstips',
      icon: '⚔️',
      color: '#ff2d55',
      description: 'Aim, vapentips och hur du vinner fler fights',
      guides: [
        {
          id: 'aim-training',
          title: 'Förbättra din Aim',
          difficulty: 'Nybörjare',
          isPremium: false,
          icon: '🎯',
          content: [
            {
              type: 'intro',
              text: 'Bra aim är grunden för allt. Här är de bästa tipsen för att förbättra din aim i Fortnite.'
            },
            {
              type: 'tip',
              title: 'Hitta rätt Sensitivity',
              text: 'Börja med låg sensitivity och höj sakta. Du bör kunna göra en 360° sväng med en full svepning av musmattan. Testa: 800 DPI, 6-8% in-game sensitivity.',
              keys: 'Inställningar → Mus → Sensitivity'
            },
            {
              type: 'tip',
              title: 'Crosshair Placement',
              text: 'Håll alltid ditt sikte i huvudhöjd. De flesta nybörjare siktar på marken. Att sikta i rätt höjd sparar tid i varje fight.',
              keys: 'Håll siktet i huvudhöjd → Mindre justering behövs'
            },
            {
              type: 'tip',
              title: 'Aim Training Maps',
              text: 'Spela aim training maps i Creative varje dag i 15-20 minuter innan du spelar matcher. Konsistens är nyckeln.',
              keys: 'Creative → Sök "aim training" → Spela 15-20 min'
            },
            {
              type: 'pro',
              title: 'Controller vs Keyboard',
              text: 'Controller: Använd linjär input och öva på aim assist timing. Keyboard: Använd arm-aim, inte handled. Båda kan vara lika bra med rätt övning.'
            }
          ]
        },
        {
          id: 'weapon-loadout',
          title: 'Bästa Loadouts',
          difficulty: 'Medel',
          isPremium: false,
          icon: '🔫',
          content: [
            {
              type: 'intro',
              text: 'Rätt loadout kan avgöra en match. Här är de bästa kombinationerna och varför de fungerar.'
            },
            {
              type: 'tip',
              title: 'Standard Loadout',
              text: 'AR + Shotgun + SMG + Heals + Heals/Utility. Detta ger dig vapen för alla avstånd och tillräckligt med healing.',
              keys: 'Slot 1: AR | Slot 2: Shotgun | Slot 3: SMG | Slot 4-5: Heals'
            },
            {
              type: 'tip',
              title: 'Aggro Loadout',
              text: 'Shotgun + SMG + Sniper + Heals + Mobility. För dig som vill pusha fights och ta kontroll.',
              keys: 'Slot 1: Shotgun | Slot 2: SMG | Slot 3: Sniper | Slot 4: Heals | Slot 5: Mobility'
            },
            {
              type: 'tip',
              title: 'Vapenprioritet',
              text: 'Guld > Lila > Blå. MEN: en blå shotgun du är bekväm med slår en guld pistol du aldrig använder. Välj vapen du kan hantera.',
              keys: 'Komfort > Raritet'
            },
            {
              type: 'pro',
              title: 'Snabbyte (Weapon Switch)',
              text: 'Öva på att snabbt byta från shotgun till SMG efter första skottet. Denna combo gör mer skada än att vänta på nästa shotgun-skott.'
            }
          ]
        },
        {
          id: 'shotgun-mastery',
          title: 'Shotgun Mastery',
          difficulty: 'Avancerad',
          isPremium: true,
          icon: '💥',
          content: [
            {
              type: 'intro',
              text: 'Shotguns avgör närstrid i Fortnite. Lär dig maximera din damage med rätt timing och positionering.'
            },
            {
              type: 'tip',
              title: 'Jump + Shoot Timing',
              text: 'Skjut vid toppen av ditt hopp för bästa vinkel nedåt mot motståndaren. Hoppa inte planlöst - varje hopp ska ha ett syfte.',
              keys: 'Hopp → Sikta vid toppen → Skjut → Bygg'
            },
            {
              type: 'tip',
              title: 'Edit + Pump Combo',
              text: 'Editera → skjut pumpen → stäng edit → byt till SMG om de är låga. Timing är allt.',
              keys: 'Edit → Pump → Reset → SMG (om låga)'
            },
            {
              type: 'pro',
              title: 'One-Pump Tips',
              text: 'Sikta alltid på huvudet för max damage. Gå nära nog - shotguns gör mer skada ju närmare du är. Vänta tills crosshair är rött.'
            }
          ]
        }
      ]
    },
    {
      id: 'gamesense',
      title: 'Game Sense',
      icon: '🧠',
      color: '#af52de',
      description: 'Strategier, rotationer och smarta beslut',
      guides: [
        {
          id: 'landing-spots',
          title: 'Bästa Landing Spots',
          difficulty: 'Nybörjare',
          isPremium: false,
          icon: '🪂',
          content: [
            {
              type: 'intro',
              text: 'Var du landar påverkar hela din match. Här lär du dig välja rätt spot baserat på din spelstil.'
            },
            {
              type: 'tip',
              title: 'Hot Drops (för övning)',
              text: 'Landa på populära platser som Tilted-liknande POIs. Du dör ofta men lär dig strid snabbt. Bäst för att förbättras.',
              keys: 'Hög risk → Hög belöning → Snabb förbättring'
            },
            {
              type: 'tip',
              title: 'Edge Map Drops (för placering)',
              text: 'Landa på kanten av kartan för säker looting. Bra för Arena/turnering där placering ger poäng.',
              keys: 'Säker loot → Bra rotation → Bättre placering'
            },
            {
              type: 'tip',
              title: 'Split Landing (Duos/Squads)',
              text: 'I lag: landa nära varandra men inte på exakt samma ställe. Dela upp looten och möts sedan.',
              keys: 'Nära men separata byggnader → Dela loot → Möts'
            },
            {
              type: 'pro',
              title: 'Hemligt tips',
              text: 'Lär dig 2-3 landing spots riktigt bra istället för att variera. Känn till varje kista, varje golvloot-spawn och escape routes.'
            }
          ]
        },
        {
          id: 'rotation-strategy',
          title: 'Rotation & Zonkontroll',
          difficulty: 'Medel',
          isPremium: true,
          icon: '🗺️',
          content: [
            {
              type: 'intro',
              text: 'Att veta NÄR och HUR man roterar till zonen är skillnaden mellan top 50 och Victory Royale.'
            },
            {
              type: 'tip',
              title: 'Tidiga Rotationer',
              text: 'Börja rotera när 1:a zonen visas, inte när stormen kommer. Tidig rotation = bättre position = lättare fights.',
              keys: 'Zon visas → Börja röra dig → Välj position'
            },
            {
              type: 'tip',
              title: 'Naturlig Cover',
              text: 'Använd berg, hus och träd som skydd istället för att bygga. Sparar material för endgame.',
              keys: 'Terräng > Byggnader (tidigt i match)'
            },
            {
              type: 'tip',
              title: 'Storm Surge',
              text: 'I stacked lobbys: se till att göra tillräckligt med damage för att undvika storm surge. Skjut på strukturer och ta safe shots.',
              keys: 'Kolla damage-tröskeln → Ta safe shots → Skjut strukturer'
            },
            {
              type: 'pro',
              title: 'Endgame Positioning',
              text: 'Försök alltid vara på höjd i endgame. Den som har high ground i sista zonerna vinner oftast. Spara material och heals för detta.'
            }
          ]
        },
        {
          id: 'mindset',
          title: 'Mindset & Förbättring',
          difficulty: 'Nybörjare',
          isPremium: false,
          icon: '💪',
          content: [
            {
              type: 'intro',
              text: 'Din mentalitet är det viktigaste verktyget. Här är hur proffsen tänker och förbättras.'
            },
            {
              type: 'tip',
              title: 'VOD Review',
              text: 'Spela in dina matcher och titta tillbaka. Fråga dig: "Vad kunde jag gjort annorlunda?" varje gång du dör.',
              keys: 'Spela in → Titta tillbaka → Identifiera misstag'
            },
            {
              type: 'tip',
              title: 'Warm-up Routine',
              text: '15 min aim training → 15 min edit courses → 15 min boxfights → Sen ranked/turnering. Skippa aldrig uppvärmningen.',
              keys: '15min aim → 15min edits → 15min boxfight → Match'
            },
            {
              type: 'tip',
              title: 'Tilt Management',
              text: 'Om du dör 3 gånger i rad: ta en paus. Spela Creative eller gör något annat. Att spela på tilt gör dig sämre.',
              keys: '3 dödar i rad → Paus → Creative → Tillbaka'
            },
            {
              type: 'pro',
              title: 'Konsistens > Intensitet',
              text: '1 timme om dagen varje dag > 7 timmar en dag i veckan. Ditt muskelminne byggs av konsistent övning, inte maratonpass.'
            }
          ]
        }
      ]
    },
    {
      id: 'secrets',
      title: 'Hemliga Tips & Tricks',
      icon: '🤫',
      color: '#ffd60a',
      description: 'Saker som bara erfarna spelare vet om',
      guides: [
        {
          id: 'movement-tricks',
          title: 'Movement Tricks',
          difficulty: 'Medel',
          isPremium: true,
          icon: '🏃',
          content: [
            {
              type: 'intro',
              text: 'Rörelse är underskattat i Fortnite. Dessa tricks gör dig mycket svårare att träffa.'
            },
            {
              type: 'tip',
              title: 'Bunny Hop',
              text: 'Hoppa direkt när du landar för att behålla momentum. Fungerar speciellt bra nerför backar.',
              keys: 'Hoppa → Landa → Hoppa direkt igen'
            },
            {
              type: 'tip',
              title: 'Crouch Spam i Fights',
              text: 'Ducka upp och ner slumpmässigt under fights. Det gör ditt huvud omöjligt att tracka för motståndaren.',
              keys: 'Skjut → Ducka → Res dig → Ducka → Skjut'
            },
            {
              type: 'tip',
              title: 'Mantling Tricks',
              text: 'Du kan mantla (klättra upp) på kanter snabbare om du hoppar precis innan kanten. Sparar tid i fights.',
              keys: 'Sprint → Hopp precis vid kant → Mantla'
            },
            {
              type: 'pro',
              title: 'Slide Cancel',
              text: 'Slide → hoppa → slide igen. Ger dig hastighetsboost och gör dig svår att träffa. Perfekt för rotationer.'
            }
          ]
        },
        {
          id: 'hidden-mechanics',
          title: 'Dolda Mekaniker',
          difficulty: 'Avancerad',
          isPremium: true,
          icon: '🔧',
          content: [
            {
              type: 'intro',
              text: 'Fortnite har massor av mekaniker som aldrig förklaras i spelet. Här avslöjar vi dem.'
            },
            {
              type: 'tip',
              title: 'Coin Flip Wall Replace',
              text: 'När du försöker ta någons vägg har du ~50% chans. Tricket: slå väggen och bygg i SAMMA knapptryckning. Timing är allt.',
              keys: 'Hacka → Bygg direkt → Timing avgör'
            },
            {
              type: 'tip',
              title: 'Pre-editing',
              text: 'Du kan editera en byggnad INNAN du placerar den. Användbart för att snabbt placera halva väggar eller editerade golv.',
              keys: 'Edit-knapp → Editera → Placera redan editerad byggnad'
            },
            {
              type: 'tip',
              title: 'Phasing',
              text: 'Om du står tillräckligt nära en byggnads kant och bygger, kan du "phasa" igenom den. Används av proffs för att komma in i motståndarens box.',
              keys: 'Stå vid kant → Bygg → Gå igenom'
            },
            {
              type: 'pro',
              title: 'Audio Cues',
              text: 'Lyssna på fotsteg, kist-ljud och skottljud. Bra hörlurar + visualize sound OFF (det laggar) = bättre awareness. Lär dig skilja på avstånd baserat på ljudvolym.'
            }
          ]
        },
        {
          id: 'settings-optimization',
          title: 'Optimera Inställningar',
          difficulty: 'Nybörjare',
          isPremium: false,
          icon: '⚙️',
          content: [
            {
              type: 'intro',
              text: 'Rätt inställningar kan ge dig en enorm fördel. De flesta proffs använder liknande settings - här är varför.'
            },
            {
              type: 'tip',
              title: 'Grafik: Performance Mode',
              text: 'Använd Performance Mode om du kan. Det ger högre FPS och färre distraktioner. Sänk allt utom View Distance.',
              keys: 'Inställningar → Grafik → Performance Mode'
            },
            {
              type: 'tip',
              title: 'Keybinds',
              text: 'Bygg-keybinds bör vara på knappar du når utan att flytta handen från WASD. Q, E, R, C, V, Mouse buttons är populära.',
              keys: 'Vägg: Q | Golv: E | Trappa: C | Tak: V'
            },
            {
              type: 'tip',
              title: 'Edit on Release',
              text: 'Slå på "Edit on Release" - det gör edits mycket snabbare. Alla proffs använder detta.',
              keys: 'Inställningar → Edit on Release → PÅ'
            },
            {
              type: 'pro',
              title: 'Controller Settings',
              text: 'Linjär input > Exponentiell för de flesta. Builder Pro + Instant Build. Edit Hold Time: 0. Dead Zone: Så låg som möjligt utan drift.'
            }
          ]
        }
      ]
    }
  ],

  // Premium pricing info
  premium: {
    price: '29 kr',
    title: 'Pro Pass',
    features: [
      'Alla avancerade guider',
      'Boxfighting masterclass',
      'Hemliga mekaniker',
      'Tunneling & rotation',
      'Shotgun mastery',
      'Movement tricks',
      'Cone edit tekniker',
      'Retake-guider',
      'Nya guider varje vecka'
    ]
  }
};
