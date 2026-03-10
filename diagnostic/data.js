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

// Call structure template
const CALL_STRUCTURE = [
    { phase: 'Öppning', duration: '5 min', description: 'Framställ syftet. Bekräfta konfidentialitet. Förtydliga att detta är diagnostiskt, inte utvärderande.' },
    { phase: 'Kontext', duration: '10 min', description: 'Fråga om deras roll, erfarenhet, största nuvarande utmaning. Låt dem definiera sin värld först.' },
    { phase: 'Strukturerade frågor', duration: '30 min', description: 'Arbeta igenom frågeuppsättningen för deras roll. Följ diagnostiska signaler. Sond vid vaghet.' },
    { phase: 'Syntes + Avslut', duration: '15 min', description: 'Reflektera tillbaka. Fråga: "Finns det något viktigt du förväntade dig att jag skulle fråga som jag inte frågade?" Avsluta med nästa steg.' }
];
