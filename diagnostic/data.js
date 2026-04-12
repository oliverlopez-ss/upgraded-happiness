// ============================================================
// Structsales Revenue Architecture Diagnostic — Data Layer
// ============================================================

// Demo users for login
const DEMO_USERS = [
    {
        email: 'oliver@structsales.se',
        password: 'structsales2026',
        name: 'Oliver Lopez',
        role: 'Advisor',
        company: 'Structsales'
    },
    {
        email: 'demo@kund.se',
        password: 'demo1234',
        name: 'Anna Eriksson',
        role: 'CEO',
        company: 'TechCorp AB'
    }
];

// Stakeholder role templates from Field Guide
const STAKEHOLDER_ROLES = [
    {
        role: 'CEO / Founder',
        priority: 'Owner',
        order: 1,
        why: 'Sätter strategisk kontext. Avslöjar om tillväxtmål är strukturellt stöttade eller personberoende.',
        questions: [
            'Hur beskriver du er intäktsmodell för en nyanställd? Gå igenom den.',
            'Vad är ert nuvarande tillväxtmål för de kommande 12 månaderna, och vad är planen?',
            'Var kommer majoriteten av nya intäkter ifrån idag — inbound, outbound, referral, eller annat?',
            'Om er bästa säljare sa upp sig imorgon, vad skulle hända med er pipeline på 90 dagar?',
            'Hur trygg är du i er nuvarande forecast? Vad ger dig den tryggheten?',
            'Vilken del av den kommersiella motorn har du minst insyn i just nu?',
            'Hur skulle en framgångsrik kommersiell arkitektur se ut för er — om 18 månader?'
        ],
        probe: 'System vs. personer — fråga om svaret beskriver en process eller om det beror på specifika individer.'
    },
    {
        role: 'Head of Sales',
        priority: 'Core',
        order: 2,
        why: 'Exponerar pipeline-verklighet, forecast-vanor och individ- vs. systemberoende.',
        questions: [
            'Gå igenom en typisk affär från första kontakt till stängning. Vilka steg och vad definierar varje?',
            'Hur kvalificerar ni affärer innan de kommer in i pipelinen? Finns det ett ramverk eller är det magkänsla?',
            'Hur ser er nuvarande pipeline ut vad gäller fördelning över stages?',
            'Hur bygger du din forecast för månaden/kvartalet? Vilka inputs förlitar du dig på?',
            'Var fastnar affärer oftast eller blir tysta? Vad händer då?',
            'Hur beskriver du kvaliteten på leads ni får från marketing? Vad saknas?',
            'Om du skulle peka på en sak som mest begränsar teamets förmåga att stänga mer — vad?'
        ],
        probe: 'Forecast-konfidens — fråga om numret baseras på deal-by-deal-analys eller viktad sannolikhet.'
    },
    {
        role: 'Marketing Lead',
        priority: 'Core',
        order: 3,
        why: 'Synliggör attributionsgaps, MQL-kvalitetsproblem och alignment med säljrörelsen.',
        questions: [
            'Hur definierar ni en marketing-qualified lead i er nuvarande setup?',
            'Vad händer med en lead efter att marketing lämnat över den till sales?',
            'Hur mäter ni marketings bidrag till stängd intäkt idag? Vilka mätvärden?',
            'Vilken kanal genererar den högsta kvaliteten på pipeline, enligt dig? Hur vet du det?',
            'Var upplever du störst glapp mellan vad marketing producerar och vad sales behöver?',
            'När en affär förloras, får marketing reda på varför? Hur?',
            'Hur skulle bättre alignment med säljteamet se ut i praktiken?'
        ],
        probe: 'Attribution — fråga specifikt hur de rapporterar länken mellan en kampanj och en stängd affär.'
    },
    {
        role: 'CS / Retention Lead',
        priority: 'Supporting',
        order: 4,
        why: 'Avslöjar churn-drivare, expansion-readiness och huruvida onboarding speglar produktvärde.',
        questions: [
            'Hur ser de första 90 dagarna ut för en ny kund efter signering? Vem äger processen?',
            'Vilka är de vanligaste orsakerna till att kunder churnar eller minskar vid förnyelse?',
            'Hur tidigt upptäcker ni typiskt en kund som är i riskzonen? Vilka signaler letar ni efter?',
            'Hur stor andel av er nuvarande intäktsbas är genuint hälsosam — engagerad, expanderande, eller låg churn-risk?',
            'Finns det en formell expansion- eller upsell-rörelse i ert team? Hur triggas den?',
            'Hur alignat är CS-teamet med de löften som gavs under säljprocessen?',
            'Om du kunde ändra en sak i hur företaget lämnar kunder från sälj till CS, vad?'
        ],
        probe: 'Sälj-till-CS handoff — fråga om det finns en formell intern brief eller bara verbal kontext.'
    },
    {
        role: 'CFO / Finance',
        priority: 'Supporting',
        order: 5,
        why: 'Validerar intäktsförutsägbarhet, enhetsekonomi-förståelse och KPI-klarhet på styrelsenivå.',
        questions: [
            'Hur tänker du kring intäktsförutsägbarhet idag? Är er prognos tillförlitlig?',
            'Vilka KPI:er spårar ni på styrelse-/ledningsnivå för kommersiell prestation?',
            'Har ni synlighet i CAC och LTV på en meningsfull granularitetsnivå? Hur används de?',
            'Vad är er nuvarande bruttomarginal, och hur har den trendat de senaste 12 månaderna?',
            'Hur trygg är du att headcount i sälj och marketing är rätt dimensionerat?',
            'Var i den kommersiella modellen upplever du störst finansiell risk just nu?',
            'Om tillväxten avtar, vilken kommersiell hävstång drar du i först?'
        ],
        probe: 'Kommersiellt headcount vs. intäktsmål — fråga om ratio känns effektivt.'
    }
];

// 7 Diagnostic Signals from Field Guide
const DIAGNOSTIC_SIGNALS = [
    {
        id: 'forecast-vagueness',
        number: '01',
        name: 'Forecast Vagueness',
        tag: 'Forecast',
        tagColor: '#f59e0b',
        description: 'Intäktsprognoser beskrivs i termer av optimism, ansträngning eller allmän trend snarare än strukturerad metodik. Ingen deal-baserad sannolikhetslogik finns.',
        listenFor: '"vi känner oss bra inför Q2", "pipelinen ser hälsosam ut", eller tystnad vid frågor om konverteringstal per stage'
    },
    {
        id: 'hero-dependency',
        number: '02',
        name: 'Hero Dependency',
        tag: 'Dependency',
        tagColor: '#ef4444',
        description: 'En eller två högpresterande individer genererar en oproportionerligt stor del av pipeline eller stängd intäkt. Systemet fungerar medan de finns men har ingen strukturell redundans.',
        listenFor: '"[Namn] hanterar det", "när hon slutar vet jag inte vad vi gör", tvekan kring hur processer ser ut utan en specifik person'
    },
    {
        id: 'stage-ambiguity',
        number: '03',
        name: 'Stage Ambiguity',
        tag: 'Pipeline',
        tagColor: '#3b82f6',
        description: 'Pipeline-steg finns men saknar beteendemässiga definitioner. Affärer rör sig mellan stages baserat på tid eller subjektiv bedömning snarare än objektiva kriterier.',
        listenFor: '"det rör sig liksom framåt", odefinierade exit-kriterier, eller olika svar från samma team'
    },
    {
        id: 'attribution-blindness',
        number: '04',
        name: 'Attribution Blindness',
        tag: 'Alignment',
        tagColor: '#8b5cf6',
        description: 'Marketing kan inte spåra det direkta bidraget från specifika aktiviteter till stängd intäkt. Kanalattribution saknas, är anekdotisk, eller baseras på last-touch-logik.',
        listenFor: '"vi vet att det fungerar men det är svårt att bevisa", beroende av korrelation snarare än kausal attribution'
    },
    {
        id: 'conversion-silence',
        number: '05',
        name: 'Conversion Silence',
        tag: 'Pipeline',
        tagColor: '#3b82f6',
        description: 'Ingen kan artikulera konverteringstal mellan pipeline-stages med precision. Data finns i CRM men granskas eller betros inte.',
        listenFor: '"jag får kolla det", oförmåga att citera stage-konvertering utan att logga in, CRM-data som "inte riktigt uppdaterat"'
    },
    {
        id: 'qualification-drift',
        number: '06',
        name: 'Qualification Drift',
        tag: 'Foundation',
        tagColor: '#10b981',
        description: 'ICP är vagt definierat eller används inte som filter i praktiken. Sälj tar möten baserat på tillgänglighet snarare än strukturell passning.',
        listenFor: '"vi tar ett möte med vem som helst", ICP beskrivet olika av olika personer, affärer öppna 6+ månader'
    },
    {
        id: 'misaligned-expectations',
        number: '07',
        name: 'Misaligned Expectations',
        tag: 'Alignment',
        tagColor: '#8b5cf6',
        description: 'Kunder uttrycker förvåning efter signering. Löftet i säljprocessen skiljer sig materiellt från vad CS levererar. Onboarding-problem eller tidig churn signalerar detta.',
        listenFor: '"sälj lovar för mycket", tidig churn koncentrerad till månad 1-3, CS-frustration över att inte vara involverade före signering'
    }
];

// Gap tags mapping to RAP modules
const GAP_TAGS = [
    { id: 'Pipeline', label: 'Pipeline', module: 'Pipeline Architecture', color: '#3b82f6', description: 'Stages, konverteringslogik och deal-progression odefinierade eller inkonsekventa.' },
    { id: 'Foundation', label: 'Foundation', module: 'Commercial Foundation', color: '#10b981', description: 'ICP, kvalificeringskriterier och GTM-principer saknas eller är oklara.' },
    { id: 'Forecast', label: 'Forecast', module: 'Forecast & KPI Architecture', color: '#f59e0b', description: 'Forecast-metodik opålitlig, laggande eller baserad på subjektiva inputs.' },
    { id: 'Dependency', label: 'Dependency', module: 'Dependency Removal', color: '#ef4444', description: 'Intäkter beror på en eller två individer snarare än repeterbara system.' },
    { id: 'Alignment', label: 'Alignment', module: 'Sales-Marketing Alignment', color: '#8b5cf6', description: 'Demand generation och kommersiell exekvering lever i separata verkligheter.' }
];

// Assessment timeline
const ASSESSMENT_TIMELINE = [
    { days: '1-2', stage: 'Setup', activity: 'Bekräfta stakeholders, boka intervjuer, dela pre-read.', icon: '&#9881;' },
    { days: '3-5', stage: 'Intervjuer', activity: 'Genomför alla 4-5 discovery-samtal. Logga syntesnoter efter varje.', icon: '&#9998;' },
    { days: '6-7', stage: 'Analys', activity: 'Kartlägg gaps, tagga per modul, poängsätt severitet.', icon: '&#9878;' },
    { days: '8-9', stage: 'Utkast', activity: 'Skriv avsnitt 1-5 i Assessment Report.', icon: '&#9776;' },
    { days: '10', stage: 'Intern granskning', activity: 'Stresstesta fynd. Kontroll: känns roadmapen strukturellt härledd?', icon: '&#10003;' },
    { days: '11', stage: 'Kundpresentation', activity: 'Presentera fynd. Framställ engagement som logiskt nästa steg.', icon: '&#9733;' },
    { days: '12', stage: 'Uppföljning', activity: 'Leverera slutrapport. Bekräfta proposal-tidslinje.', icon: '&#10148;' }
];

// Report sections template
const REPORT_SECTIONS = [
    {
        id: 'S1',
        title: 'Executive Summary',
        description: 'Skriv 3-5 meningar max. Beskriv kärnfyndet, den primära strukturella risken och den enskilt viktigaste rekommenderade åtgärden.',
        fields: [
            { key: 'coreFinding', label: 'Kärnfynd', placeholder: 'Vad är den fundamentala kommersiella arkitektur-utmaningen?' },
            { key: 'primaryRisk', label: 'Primär risk', placeholder: 'Vad händer om detta inte adresseras inom 6-12 månader?' },
            { key: 'primaryRecommendation', label: 'Primär rekommendation', placeholder: 'Vad är den viktigaste strukturella interventionen?' }
        ]
    },
    {
        id: 'S2',
        title: 'Assessment Scope',
        description: 'Dokumentera exakt vad som bedömdes och vad som exkluderades.',
        fields: [
            { key: 'companiesAssessed', label: 'Bedömt företag', placeholder: 'Företagsnamn, bransch, headcount, ARR-intervall' },
            { key: 'stakeholdersInterviewed', label: 'Intervjuade stakeholders', placeholder: 'Roll — Namn — Datum' },
            { key: 'duration', label: 'Varaktighet', placeholder: 'Totalt antal dagar, intervjuer, timmar' },
            { key: 'excluded', label: 'Explicit exkluderat', placeholder: 'Vad var utanför scope och varför?' }
        ]
    },
    {
        id: 'S3',
        title: 'Current State',
        description: 'Beskriv vad som faktiskt existerar idag — inte vad företaget tror eller aspirerar till.',
        fields: [
            { key: 'revenueModel', label: 'Intäktsmodell', placeholder: 'Hur genererar företaget intäkt? Primär motion?' },
            { key: 'teamStructure', label: 'Kommersiell teamstruktur', placeholder: 'Vem gör vad? Antal i sälj, marketing, CS?' },
            { key: 'pipelineProcess', label: 'Pipeline & Process', placeholder: 'Hur spåras affärer? Vilka stages? Kvalificeringsramverk?' },
            { key: 'forecastPractice', label: 'Forecast-praktik', placeholder: 'Hur görs prognoser? Vilka inputs? Tillförlitlighet?' },
            { key: 'marketingSalesDynamic', label: 'Marketing-Sales dynamik', placeholder: 'Interaktion? Handoff? Spänningar?' },
            { key: 'csModel', label: 'Customer Success-modell', placeholder: 'Vad händer post-sale? Retention & expansion?' }
        ]
    },
    {
        id: 'S4',
        title: 'Strukturell Gap-analys',
        description: 'Kärnan i rapporten. Varje gap inkluderar: observation, evidens, gap-tagg, severitet och affärsimplikation.',
        fields: [],
        dynamic: true
    },
    {
        id: 'S5',
        title: 'Prioriterad Roadmap',
        description: 'Ranka gaps efter severitet och sekvens. Framställ sekvensen som en beroendekedja.',
        fields: [
            { key: 'dependencyLogic', label: 'Beroendelogik', placeholder: 'Varför är denna sekvens strukturellt korrekt?' },
            { key: 'estimatedTimeline', label: 'Uppskattad tidslinje', placeholder: '3 månader / 6 månader / 12+ månader' }
        ],
        dynamic: true
    },
    {
        id: 'S6',
        title: 'Rekommenderat Engagement',
        description: 'Logisk slutsats av analysen. Ska kännas oundviklig givet identifierade gaps.',
        fields: [
            { key: 'recommendedProgramme', label: 'Rekommenderat program', placeholder: 'Revenue Architecture Programme — vilka moduler och varför' },
            { key: 'engagementFormat', label: 'Engagement-format', placeholder: 'Månadsrådgivning, veckovisa arbetssessioner, kvartalsvis governance' },
            { key: 'investmentLevel', label: 'Investeringsnivå', placeholder: 'Från 7 950 EUR/månad — specificera tier och motivering' },
            { key: 'expectedOutcome', label: 'Förväntat resultat', placeholder: 'Strukturell progress om 90 dagar? Om 6 månader?' }
        ]
    }
];

// Severity levels
const SEVERITY_LEVELS = [
    { id: 'high', label: 'Hög', color: '#ef4444', description: 'Blockerar tillväxt' },
    { id: 'medium', label: 'Medium', color: '#f59e0b', description: 'Skapar friktion' },
    { id: 'low', label: 'Låg', color: '#6b7280', description: 'Suboptimalt men hanterbart' }
];

// Severity scoring model — 4 weighted dimensions
// Each dimension scored 1-3. Sum 10-12 = High, 7-9 = Medium, 4-6 = Low.
const SEVERITY_CRITERIA = [
    {
        id: 'revenue',
        label: 'Revenue Impact',
        question: 'Hur direkt påverkar detta intäkten?',
        levels: [
            { value: 1, label: 'Ineffektivitet', description: 'Skapar operativ friktion men påverkar inte intäkt direkt' },
            { value: 2, label: 'Begränsar tillväxt', description: 'Hindrar förmågan att skala intäkt' },
            { value: 3, label: 'Blockerar/läcker intäkt', description: 'Intäkt förloras eller saknas just nu p.g.a. detta' }
        ]
    },
    {
        id: 'depth',
        label: 'Strukturellt djup',
        question: 'Hur djupt sitter problemet i arkitekturen?',
        levels: [
            { value: 1, label: 'Operativt', description: 'Ytligt — kan lösas inom befintliga system/processer' },
            { value: 2, label: 'Process/system', description: 'Kräver omdesign av process eller systemintegration' },
            { value: 3, label: 'Fundamentalt', description: 'Berör ICP, intäktsmodell eller organisationsdesign' }
        ]
    },
    {
        id: 'reversibility',
        label: 'Reversibilitet',
        question: 'Hur svårt/dyrt är det att åtgärda?',
        levels: [
            { value: 1, label: '< 3 månader', description: 'Kan åtgärdas taktiskt med befintliga resurser' },
            { value: 2, label: '3–6 månader', description: 'Kräver riktat projekt med dedikerade resurser' },
            { value: 3, label: '6–12+ månader', description: 'Kräver strukturell omdesign, change management, nya kompetenser' }
        ]
    },
    {
        id: 'corroboration',
        label: 'Bekräftelsegrad',
        question: 'Hur validerat är fyndet?',
        levels: [
            { value: 1, label: '1 källa', description: 'Hört från en stakeholder, ej korsvaliderat' },
            { value: 2, label: '2 stakeholders', description: 'Bekräftat av minst två oberoende källor' },
            { value: 3, label: '3+ eller data', description: 'Bekräftat av tre+ källor, eller direkt observerbart i data/system' }
        ]
    }
];

// Severity computation: sum of 4 dimensions (range 4-12)
// 10-12 = High, 7-9 = Medium, 4-6 = Low
function computeSeverityFromScores(scores) {
    if (!scores) return null;
    const values = SEVERITY_CRITERIA.map(c => scores[c.id] || 0).filter(v => v > 0);
    if (values.length < SEVERITY_CRITERIA.length) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum >= 10) return 'high';
    if (sum >= 7) return 'medium';
    return 'low';
}

// Analysis areas — cross-cutting diagnostic dimensions
const ANALYSIS_AREAS = [
    {
        id: 'affarsmal',
        name: 'Affärsmål',
        icon: '&#9678;',
        color: '#4a7cff',
        purpose: 'Avslöja om tillväxtmålet är strukturellt härlett ur arkitekturen eller en önskesiffra utan modellstöd.',
        architecturalLens: 'En tillväxtplan utan arkitektur är en prognos utan fundament. Vi testar om målet kan härledas från konvertering × volym × velocity × deal size — eller om det bygger på hopp.',
        relatedSignals: ['forecast-vagueness', 'misaligned-expectations'],
        relatedTags: ['Forecast', 'Alignment'],
        questions: [
            'Kan ni härleda tillväxtmålet ur en dokumenterad modell (pipeline-volym × konvertering × deal size × velocity) — eller är det en top-down-siffra utan underliggande arkitektur?',
            'Finns en strukturerad nedbrytning från ARR-mål till pipeline-mål till aktivitetsmål per roll — eller är kopplingen underförstådd?',
            'Vem äger vilken del av målet, och finns en formaliserad governance-rytm där strukturell progression mäts — eller följs det upp när siffrorna redan missats?',
            'När antagandena bakom målet ändras (konvertering sjunker, cycle time ökar) — finns en arkitekturell respons-loop som justerar plan och resurser, eller upptäcks avvikelsen först i efterhand?',
            'Om en extern revisor frågade "vilka 5 mätbara antaganden måste vara sanna för att målet ska nås?" — kan ni svara med arkitektur, eller med övertygelse?',
            'Är tillväxtmålet strukturellt försvarbart (härledbart, reviderbart, spårbart) eller vilar det på enskilda individers leverans?'
        ]
    },
    {
        id: 'budskap',
        name: 'Budskap',
        icon: '&#9788;',
        color: '#f59e0b',
        purpose: 'Testa om värdebudskapet är en arkitekturerad tillgång eller tre parallella berättelser som sälj, marketing och CS bär var för sig.',
        architecturalLens: 'Budskapsarkitektur existerar när samma värdepåstående återfinns i samma form genom hela funnel:n. Utan den blir varje interaktion en improvisation.',
        relatedSignals: ['misaligned-expectations', 'qualification-drift'],
        relatedTags: ['Foundation', 'Alignment'],
        questions: [
            'Finns en dokumenterad budskapsarkitektur (Messaging House, Value Framework) som sälj, marketing och CS styr efter — eller improviserar varje funktion sin egen version?',
            'Är budskapet strukturellt kopplat till ICP-segment (differentierat per persona/segment) — eller levereras samma generiska pitch till alla?',
            'När affärer förloras på "vi valde annan lösning" — finns en arkitekturell loop som systematiskt matar tillbaka insikten till budskaps- och positioneringsarbetet, eller hamnar feedbacken i glömska?',
            'Är värdeerbjudandet kvantifierat i en ROI-modell eller cases-bibliotek med siffror — och tillgängligt som strukturerad tillgång i säljrörelsen?',
            'Finns governance för budskapet (ägare, uppdateringsrytm, versionshantering) — eller lever den "sanna" versionen i marketingchefens huvud?',
            'Testas budskapet strukturellt (win/loss-intervjuer, A/B-test, konvertering per segment) — eller utvärderas det på magkänsla?'
        ]
    },
    {
        id: 'kunder',
        name: 'Kunder',
        icon: '&#9673;',
        color: '#10b981',
        purpose: 'Exponera om kundförståelsen är operationaliserad i arkitekturen eller ligger som tribal kunskap hos enskilda.',
        architecturalLens: 'ICP-arkitektur syns inte i slides — den syns i CRM-filter, kvalificeringslogik, prissättning och CS-motion. Där ingen arkitektur finns, behandlas alla kunder likartat.',
        relatedSignals: ['qualification-drift', 'misaligned-expectations'],
        relatedTags: ['Foundation', 'Alignment'],
        questions: [
            'Är er ICP kodifierad i CRM som filtrerings- och kvalificeringslogik som styr dagligt beslutsfattande — eller är den en slide som inte påverkar vem ni prospekterar eller tar möte med?',
            'Finns en segmentarkitektur där sälj-motion, pris och CS-modell är strukturellt differentierade per segment — eller behandlas alla kunder med samma generiska modell?',
            'Är buyer personas dokumenterade på en operativ nivå (triggers, språk, objections, beslutsrytm) där en ny säljare kan använda dem i riktiga samtal — eller är de abstrakta marketingartefakter?',
            'Finns en arkitekturerad kundinsikts-loop (vem samlar, vem äger, vem distribuerar insikter från sälj, CS, support till strategi) — eller sker det ad hoc via Slack-fragment?',
            'Spåras leading indicators av kundhälsa (produktanvändning, NPS, engagemang) strukturellt och kopplat till retention- och expansion-beslut — eller reagerar ni först vid uppsägning?',
            'Finns en strukturell återkoppling från "dåliga" kunder (hög cost-to-serve, tidig churn, dålig fit) tillbaka till ICP och kvalificering — eller upprepar ni samma misstag?'
        ]
    },
    {
        id: 'processer',
        name: 'Processer',
        icon: '&#10148;',
        color: '#8b5cf6',
        purpose: 'Mäta om den kommersiella motorn är arkitekturerad och repeterbar — eller en emergent produkt av individuell improvisation.',
        architecturalLens: 'Processarkitektur är skillnaden mellan "vi brukar göra så här" och "detta är så vi gör, dokumenterat, med ägare och mätpunkter". Den ena skalar, den andra inte.',
        relatedSignals: ['stage-ambiguity', 'conversion-silence', 'hero-dependency'],
        relatedTags: ['Pipeline', 'Dependency'],
        questions: [
            'Finns en dokumenterad revenue process-karta (lead → förnyelse) med beteendemässiga stage-definitioner, exit-kriterier och ägare — eller lever processen bara som CRM-dropdownvärden?',
            'Är handoffs (MQL→SQL, Sälj→CS, CS→Expansion) formaliserade med trigger-kriterier, SLA:er och dokumenterad överlämning — eller hanteras de via Slack och mejl?',
            'När processen bryts (deal tyst, kund klagar, forecast missas) — finns en strukturerad eskalerings- och root-cause-loop, eller hanteras varje incident reaktivt och isolerat?',
            'Mäts processhälsa arkitekturellt (stage conversion, velocity, stuck deals per stage) och finns en tydlig ägare av processarkitekturen — eller är ansvaret utspritt?',
            'Finns en arkitekturerad onboarding så en ny säljare/CSM blir produktiv på definierad tid — eller beror ramp-time på vem som råkar handleda dem?',
            'Är playbooks, templates och frameworks strukturerade tillgångar med versionshantering och ägare — eller är det Google Docs utspridda över Drive som ingen underhåller?'
        ]
    },
    {
        id: 'team',
        name: 'Team',
        icon: '&#9670;',
        color: '#ef4444',
        purpose: 'Bedöma om organisationen är arkitekturerad utifrån strategi och rollstruktur — eller en produkt av historiska rekryteringar.',
        architecturalLens: 'En arkitekturerad organisation designar roller före personer. En emergent organisation bygger om strukturen runt individerna som råkar finnas — vilket skapar strukturellt hjälteberoende.',
        relatedSignals: ['hero-dependency', 'forecast-vagueness'],
        relatedTags: ['Dependency', 'Foundation'],
        questions: [
            'Är er kommersiella organisation ritad utifrån en rollarkitektur (SDR, AE, CSM, RevOps, Enablement) härledd från strategin — eller har strukturen vuxit fram runt vilka ni råkat anställa?',
            'Finns en dokumenterad ansvars- och beslutsmatris (t.ex. RACI) för kommersiella beslut — eller beror utfallet på vem som är i rummet?',
            'Hur stor del av intäkten genereras av top-2 performers, och finns arkitektur (playbooks, enablement, system) som strukturellt överför deras kunskap till resten av teamet?',
            'Är comp-planen arkitekturerad så att incentives speglar nuvarande strategiska prioriteringar — eller belönar den beteenden från ett tidigare skede av bolaget?',
            'Finns en strukturerad coaching- och enablement-arkitektur (frekvens, ramverk, ägare, progressionsmätning) — eller sker utveckling ad hoc när chefen har tid?',
            'Om era 2 bästa kommersiella medarbetare slutar samma vecka — vad i arkitekturen (processer, system, dokumentation) skyddar intäkten de kommande 90 dagarna?'
        ]
    },
    {
        id: 'system',
        name: 'System / Verktyg',
        icon: '&#9881;',
        color: '#2a9d8f',
        purpose: 'Validera om tech-stacken är arkitekturerad för att driva affären — eller ett lapptäcke av ackumulerade verktygsbeslut.',
        architecturalLens: 'Systemarkitektur handlar inte om vilka verktyg ni har, utan om hur de är integrerade för att producera strukturellt korrekta beslut. Utan arkitektur blir CRM administration, inte infrastruktur.',
        relatedSignals: ['conversion-silence', 'attribution-blindness'],
        relatedTags: ['Pipeline', 'Alignment'],
        questions: [
            'Finns en dokumenterad systemarkitektur (data flow, source of truth per entitet, integrationskarta) — eller är stacken en arkeologisk samling av historiska upphandlingar?',
            'Är datamodellen i CRM designad för att driva affären (pipeline-hygien, forecast-integritet, attribution) — eller används CRM primärt som administrativ rapporteringsyta?',
            'Vilka strategiska beslut fattas idag på opålitlig eller saknad data — och vilken arkitektur saknas för att flytta dem till evidensbaserade?',
            'Är automationen arkitekturerad kring strategiska moments (lead routing, handoff, at-risk-signal) — eller är den ett lapptäcke av punktvisa Zapier-flöden?',
            'Finns en governance-funktion (RevOps eller motsvarande) som äger systemarkitekturen — eller förvaltas den utspritt, där varje team lägger till verktyg utan helhetsperspektiv?',
            'När nya system införs — finns en strukturerad utvärdering av arkitekturell fit (data, integration, processstöd) — eller drivs införandet av enskilda teamchefers preferenser?'
        ]
    }
];

// Mapping from role-based questions to analysis areas (index-based for existing STAKEHOLDER_ROLES.questions)
// Each array matches the question order in STAKEHOLDER_ROLES[n].questions
const ROLE_QUESTION_AREAS = {
    'CEO / Founder': ['affarsmal', 'affarsmal', 'kunder', 'team', 'processer', 'processer', 'affarsmal'],
    'Head of Sales': ['processer', 'processer', 'processer', 'processer', 'processer', 'kunder', 'team'],
    'Marketing Lead': ['kunder', 'processer', 'system', 'kunder', 'processer', 'processer', 'processer'],
    'CS / Retention Lead': ['processer', 'kunder', 'kunder', 'kunder', 'processer', 'processer', 'processer'],
    'CFO / Finance': ['system', 'system', 'system', 'affarsmal', 'team', 'affarsmal', 'affarsmal']
};

// Call structure template
const CALL_STRUCTURE = [
    { phase: 'Öppning', duration: '5 min', description: 'Framställ syftet. Bekräfta konfidentialitet. Förtydliga att detta är diagnostiskt, inte utvärderande.' },
    { phase: 'Kontext', duration: '10 min', description: 'Fråga om deras roll, erfarenhet, största nuvarande utmaning. Låt dem definiera sin värld först.' },
    { phase: 'Strukturerade frågor', duration: '30 min', description: 'Arbeta igenom frågeuppsättningen för deras roll. Följ diagnostiska signaler. Sond vid vaghet.' },
    { phase: 'Syntes + Avslut', duration: '15 min', description: 'Reflektera tillbaka. Fråga: "Finns det något viktigt du förväntade dig att jag skulle fråga som jag inte frågade?" Avsluta med nästa steg.' }
];
