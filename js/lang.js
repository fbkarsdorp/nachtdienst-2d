// lang.js: the game in Dutch or in English. The Dutch stays in the code as it was written; tr() looks up its English.
// A night's bundle and the archive come in both languages (data/nights/en/, data/archive/en/), made by tools/english.py.
// The language is ?lang=en or ?lang=nl, else the one picked on the title card last time, else the browser's.
'use strict';

const LANG = (() => {
  const ok = l => l === 'nl' || l === 'en';
  const q = new URLSearchParams(location.search).get('lang');
  if (ok(q)) { try { localStorage.setItem('nachtdienst-lang', q); } catch (e) {} return q; }
  try { const s = localStorage.getItem('nachtdienst-lang'); if (ok(s)) return s; } catch (e) {}
  return (navigator.languages || [navigator.language || 'nl']).some(l => /^(nl|fy|li)\b/i.test(l)) ? 'nl' : 'en';
})();
document.documentElement.lang = LANG;
// the page's own words, outside the painting
if (LANG === 'en') {
  const set = (sel, f) => { const el = document.querySelector(sel); if (el) f(el); };
  const about = 'An evening in the Central Legend Archive, 1983. A painted puzzle game on the stories of the Dutch Folktale Database.';
  set('meta[name="description"]', e => e.content = about);
  set('#keys', e => e.setAttribute('aria-label', 'Typewriter'));
  set('#storylink', e => { e.title = 'To the Folktale Database'; e.setAttribute('aria-label', 'This story in the Folktale Database'); });
  set('#saveimg', e => e.alt = 'Your own card');
  set('#saveview figcaption', e => { e.firstChild.textContent = 'Right-click or hold to keep the card. '; });
  set('#savelink', e => e.textContent = 'Save');
  set('#saveclose', e => e.textContent = 'Close');
  set('#loading span', e => e.textContent = 'The lamp is warming up…');
  set('#turn span', e => e.textContent = 'Turn your screen: the room is wide.');
}
// the other language, from the title card: the choice is kept, the page starts again in it
function setLang(l) {
  try { localStorage.setItem('nachtdienst-lang', l); } catch (e) {}
  const p = new URLSearchParams(location.search); p.set('lang', l);
  location.search = p.toString().replace(/=(&|$)/g, '$1');
}

// tr('Nog {n} kaarten.', { n: 3 }): the English of a Dutch line (or the Dutch itself), with its blanks filled
function tr(nl, v) {
  let s = LANG === 'en' && EN[nl] != null ? EN[nl] : nl;
  if (v) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  return s;
}

const EN = {
  // cards.js
  'plaats?': 'place?',
  'nog niet ingedeeld': 'not yet classified',
  'ARCHIEF': 'ARCHIVE',
  'Verteller: {who}': 'Told by: {who}',
  'opgetekend door {who}': 'recorded by {who}',
  'onderste helft': 'bottom half',
  'samenvatting': 'summary',
  'IN TE VOEGEN — la {id}': 'TO FILE — drawer {id}',
  'INGEVOEGD': 'FILED',
  // ui.js
  'In de hand: de envelop': 'In hand: the envelope',
  'In de hand': 'In hand',
  'de assistent': 'the assistant',
  'de kat': 'the cat',
  'je': 'you',
  'Tik op iets in de kamer: {who} loopt erheen.': 'Tap something in the room: {who} will walk over to it.',
  'Klik op iets in de kamer: {who} loopt erheen.': 'Click something in the room: {who} will walk over to it.',
  'Bij een kast: pak de envelop van de la die aan de beurt is. Hij gaat mee naar de leestafel.': 'At a cabinet: take the envelope of the drawer whose turn it is. It goes to the reading table.',
  'Op tafel: maak de envelop open, lees de kaarten ({flip} draait ze om), leg ze neer.': 'On the table: open the envelope, read the cards ({flip} turns them over), lay them down.',
  '“Omdraaien”': '“Turn over”',
  'Wat op de envelop staat, is de opdracht. “Vraag J.D.” kost tijd op de klok.': 'What is written on the envelope is the task. “Ask J.D.” costs time on the clock.',
  'Een kaart kan mee in de hand, naar een kast, het raam, de deur, de machine.': 'A card can be carried in the hand: to a cabinet, the window, the door, the typewriter.',
  'Gaat het slot open, dan gaat de envelop dicht: neem hem mee en voeg hem in zijn la in.': 'When the lock opens, the envelope closes: take it and file it in its drawer.',
  'De hand houdt één ding. “Terug”, linksboven: terug.': 'The hand holds one thing. “Back”, top left: back.',
  'De hand houdt één ding. Esc of de rechterknop: terug.': 'The hand holds one thing. Esc or the right button: back.',
  '— zo gaat het —': '— how it goes —',
  'Spel': 'Game',
  'Folgert Karsdorp, gemaakt samen met Claude (Anthropic)': 'Folgert Karsdorp, made together with Claude (Anthropic)',
  'Portret': 'Portrait',
  'de nachtassistent naar een tekening van Lauren Fonteyn': 'the night assistant after a drawing by Lauren Fonteyn',
  'Verhalen': 'Stories',
  'Nederlandse Volksverhalenbank, Meertens Instituut (KNAW)': 'Dutch Folktale Database, Meertens Institute (KNAW)',
  'Naar': 'After',
  'het oorspronkelijke Nachtdienst, en de Claude Animation Base': 'the original Nachtdienst, and the Claude Animation Base',
  'Geluid': 'Sound',
  'kaarten en enveloppen: Kenney (CC0); de rest gesynthetiseerd': 'cards and envelopes: Kenney (CC0); the rest synthesised',
  'Kaart': 'Map',
  'Natural Earth; plaatsnamen: GeoNames (CC BY 4.0)': 'Natural Earth; place names: GeoNames (CC BY 4.0)',
  'Letters': 'Type',
  'Colofon': 'Colophon',
  'versie': 'version',
  // game.js, data.js
  ', en wat de assistent daar zag, dat was ____.': ', and what the assistant saw there was ____.',
  '. Op de bovenste stond een naam: ____.': '. On the top one was a name: ____.',
  'vul het zelf in. aan de machine': 'fill it in yourself. at the machine',
  'Wie zat hier vannacht?': 'Who sat here tonight?',
  'Wiens kaart is dit?': 'Whose card is this?',
  'Je eigen naam.': 'Your own name.',
  'Opgeborgen. — J.D.': 'Filed away. — J.D.',
  'Opgeborgen. Bij de anderen. — J.D.': 'Filed away. With the others. — J.D.',
  'hij heeft er één weggegooid': 'he threw one away',
  'Eén envelop tegelijk.': 'One envelope at a time.',
  'De hand is vol.': 'The hand is full.',
  'Die hoort in een andere envelop.': 'That one belongs in another envelope.',
  'Meer weet ik ook niet.': 'That is all I know.',
  'Meer naar het {dir}.': 'Further {dir}.',
  'noorden': 'north', 'noordoosten': 'northeast', 'oosten': 'east', 'zuidoosten': 'southeast',
  'zuiden': 'south', 'zuidwesten': 'southwest', 'westen': 'west', 'noordwesten': 'northwest',
  'Eerst het bovenste stuk op tafel.': 'The top half on the table first.',
  'laadt niet (na 20 s)': 'does not load (after 20 s)',
  'kon niet geladen worden': 'could not be loaded',
  // the room (views.js)
  'Kast': 'Cabinet',
  'Voortekenen': 'Omens', 'Witte wieven': 'White Women', 'Weerwolven': 'Werewolves', 'Spoken': 'Ghosts', 'De duivel': 'The Devil',
  'De klok': 'The clock',
  'Het raam': 'The window',
  'De deur': 'The door',
  'De jas van J.D.': 'J.D.’s coat',
  'De leunstoel': 'The armchair',
  'Een leunstoel. Er ligt niets op.': 'An armchair. Nothing on it.',
  'De kaart van Nederland': 'The map of the Netherlands',
  'De leestafel': 'The reading table',
  'De lamp': 'The lamp',
  'De schrijfmachine': 'The typewriter',
  'De prikker': 'The spike',
  'De prullenbak': 'The wastebasket',
  'Snippers. Niets.': 'Scraps. Nothing.',
  'Een kaart op de vloer': 'A card on the floor',
  'Lezen': 'Read',
  'Een kaart die er niet lag': 'A card that was not there before',
  'De envelop is in je hand.': 'The envelope is in your hand.',
  'Haal een envelop uit een kast.': 'Fetch an envelope from a cabinet.',
  'In de doos met helften': 'Into the box of halves',
  'Terug in de envelop': 'Back into the envelope',
  'Een groene bankierslamp.': 'A green banker’s lamp.',
  'Twaalf enveloppen…': 'Twelve envelopes…',
  '{n} van de twaalf': '{n} of the twelve',
  'Het briefje van J.D.': 'J.D.’s note',
  'Meenemen naar de kast': 'Take it to the cabinet',
  'Meenemen': 'Take',
  'Openmaken': 'Open',
  'Vraag J.D. (+{m} min)': 'Ask J.D. (+{m} min)',
  '← Terug': '← Back',
  'Naar de Verhalenbank': 'To the Folktale Database',
  'Omdraaien': 'Turn over',
  'Op tafel': 'On the table',
  'In de la': 'Into the tray',
  'In de envelop': 'Into the envelope',
  'Naar de schrijfmachine': 'To the typewriter',
  'Terug': 'Back',
  '  · veeg ⇆': '  · swipe ⇆',
  '(achterkant)': '(back)',
  'Envelop van la {id} pakken': 'Take the envelope of drawer {id}',
  'La {id}': 'Drawer {id}',
  'la {id}': 'drawer {id}',
  'La {id}: ingevoegd': 'Drawer {id}: filed',
  'Invoegen': 'File it',
  'Het archief': 'The archive',
  'In deze kast': 'Into this cabinet',
  'De envelop ligt op tafel.': 'The envelope is on the table.',
  'Het archief is niet te openen.': 'The archive will not open.',
  'Even zoeken…': 'Looking…',
  'Een kaart': 'A card',
  '{n} kaarten in deze kast': '{n} cards in this cabinet',
  'Dicht': 'Close',
  'De jas hangt er nog.': 'The coat is still hanging there.',
  'De jas van J.D. Hij is zonder jas naar huis.': 'J.D.’s coat. He went home without it.',
  // the close-ups (views2.js)
  'met de plaatsen der verhalen': 'with the places of the stories',
  'Centraal Sagenarchief': 'Central Legend Archive',
  'Eerst de envelop open.': 'Open the envelope first.',
  'Er hoeft niets op de kaart.': 'Nothing needs to go on the map.',
  'Prik de plaats van de kaart zonder plaats.': 'Pin the place of the card without a place.',
  'kaart uit kast V': 'card from cabinet V',
  'etiket voor la {id}': 'label for drawer {id}',
  'samenvatting, la {id}': 'summary, drawer {id}',
  'Op de machine leggen': 'Lay it on the machine',
  '… Op de bovenste stond': '… On the top one was',
  'een naam:': 'a name:',
  'Ingevuld.': 'Filled in.',
  'De wijzer verzetten': 'Move the hand',
  'Daarna laat je de klok met rust.': 'After that you leave the clock alone.',
  'Op de vensterbank leggen': 'Lay it on the windowsill',
  'Onder de deur door schuiven': 'Slide it under the door',
  'De deurknop': 'The doorknob',
  'Door de gleuf': 'Through the slot',
  'losse helften': 'loose halves',
  'De doos met helften': 'The box of halves',
  'Eronder leggen': 'Lay it underneath',
  'Kies een onderste helft.': 'Choose a bottom half.',
  'hoger': 'higher', 'lager': 'lower',
  'verhaal': 'story', 'verhalen': 'stories',
  'leeg': 'empty',
  '(opgelost)': '(solved)',
  'Verder met nacht {n}': 'Go on with night {n}',
  'Een nieuwe nacht': 'A new night',
  'Begin de nacht': 'Begin the night',
  'Nacht nr. {n}': 'Night no. {n}',
  'Naam:': 'Name:',
  'Je naam (voor de kaart)': 'Your name (for the card)',
  'Geluid: aan': 'Sound: on',
  'Geluid: uit': 'Sound: off',
  'Met koptelefoon. Verhalen: Nederlandse Volksverhalenbank, Meertens Instituut (KNAW).': 'With headphones. Stories: Dutch Folktale Database, Meertens Institute (KNAW).',
  'tik om verder te gaan': 'tap to go on',
  'klik om verder te gaan': 'click to go on',
  'Sage': 'Legend',
  'NACHT': 'NIGHT',
  'Twaalf enveloppen ingevoegd. {t}.': 'Twelve envelopes filed. {t}.',
  'Achterkant': 'The back',
  'Bewaar als plaatje': 'Save as a picture',
  'Folgert Karsdorp, met Claude · portret: Lauren Fonteyn · verhalen: Meertens Instituut': 'Folgert Karsdorp, with Claude · portrait: Lauren Fonteyn · stories: Meertens Institute',
  '{n} kaarten gelezen. Nog {m} in deze kasten.': '{n} cards read. {m} more in these cabinets.',
  'en nog {n}…': 'and {n} more…',
  'Bewaren lukt hier niet.': 'It cannot be saved here.',
  // the night (night.js), the corner tags and the boot (main.js)
  '(er wordt op de deur geklopt)': '(someone knocks on the door)',
  '(de klok hapert)': '(the clock falters)',
  '(gekras op het zink)': '(scratching on the roof zinc)',
  '(iets ademt tegen het raam)': '(something breathes against the window)',
  '(de klok tikt niet meer)': '(the clock has stopped ticking)',
  '(een vinger piept over het glas)': '(a finger squeaks across the glass)',
  '(de schrijfmachine tikt, uit zichzelf)': '(the typewriter types, by itself)',
  'Verteller: de vorige assistent.': 'Told by: the previous assistant.',
  '(stilte)': '(silence)',
  '(drie klopjes op de deur)': '(three knocks on the door)',
  '(voetstappen over grind, weg)': '(footsteps on gravel, going away)',
  'Twaalf enveloppen. Alles ingevoegd.': 'Twelve envelopes. All filed.',
  'Twaalf enveloppen.': 'Twelve envelopes.',
  'Hoe het werkt (H)': 'How it works (H)',
  'Geluid uit (M)': 'Sound off (M)',
  'Geluid aan (M)': 'Sound on (M)',
  'De lamp gaat niet aan.': 'The lamp will not come on.',
  'Opnieuw proberen': 'Try again',
  // the feasts (feast.js)
  'Een uitgeholde pompoen. Halloween? Dat vieren ze in Amerika. Hier lopen de kinderen over elf dagen met lampionnen langs de deuren.': 'A hollowed-out pumpkin. Halloween? They celebrate that in America. Here the children go door to door with lanterns in eleven days.',
  'Om middernacht kunnen de dieren praten, zeggen ze. Ik zeg niks.': 'At midnight the animals can talk, they say. I say nothing.',
  'Om middernacht kunnen de dieren praten, zeggen ze. Geldt dat ook voor mij?': 'At midnight the animals can talk, they say. Does that go for me too?',
  'Een kaarsje voor de kerstnacht. Om middernacht kunnen de dieren praten, staat in het archief.': 'A candle for Christmas night. At midnight the animals can talk, it says in the archive.',
  'De Sint kwam langs, het was al laat, en zag een licht dat nooit uitgaat. Hij liet een letter voor je staan: voor wie de nachtdienst durft te gaan. — de Sint': 'The Saint came by, the hour was late, and saw a light that would not abate. He left a letter here for you: for one who dares the night shift through. — the Saint',
  'Een schoen, met een wortel erin. Mensen.': 'A shoe, with a carrot in it. Humans.',
  'Mijn schoen gezet, met een wortel voor het paard. Je weet maar nooit.': 'I put out my shoe, with a carrot for the horse. You never know.',
  '(ver weg huilt iets naar de volle maan)': '(far away, something howls at the full moon)',
  '(buiten zingen kinderen: Sint-Maarten, Sint-Maarten, de koeien hebben staarten…)': '(outside, children sing: Sint-Maarten, Sint-Maarten, the cows have got tails…)',
  '(een zwarte kat loopt over het zink)': '(a black cat walks across the roof)',
  'Gelukkig nieuwjaar!': 'Happy New Year!',
  '(overal klokken en vuurwerk)': '(bells and fireworks everywhere)',
  'Een pompoen': 'A pumpkin',
  'Een kaarsje': 'A candle',
  'Een chocoladeletter': 'A chocolate letter',
  'Een schoen': 'A shoe',
  'Oliebollen': 'Oliebollen',
  'Oliebollen. Het poeder komt overal. Ook op mij.': 'Oliebollen. The sugar gets everywhere. On me too.',
  'Oliebollen, nog een beetje warm, van de kraam op de hoek. Het poeder komt overal.': 'Oliebollen, still a little warm, from the stall on the corner. The sugar gets everywhere.',
};
