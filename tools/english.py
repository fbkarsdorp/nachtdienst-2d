#!/usr/bin/env python3
"""The English edition of the data: data/nights/en/*.js and data/archive/en/*.js, made from the Dutch ones.

Each card's summary comes from data/translations/*.opus.json (sagenland's translations, and tools/translate.mjs for
the rest), unless tools/en/puzzles.json has a fix for it. What the puzzles need beyond a plain translation is in that
same file, by hand: the English answers to the word locks (found among the Dutch ones by their hashes, so the
pipeline's plain answers are not needed), the English of the words the torn halves share, and the English halves of
a card torn in mid-sentence (one torn between sentences is torn between the same English sentences). Everything
else (notes, hints, the frame) is a fixed text or a template here.

    python3 tools/english.py          build, and list what a puzzle would miss in English
    python3 tools/english.py --check  only list it
    python3 tools/english.py --draft  write every night anyway, a failing drawer left in Dutch (to look at the layout)

A night is only written when all its drawers check out; the problems are printed, one line each.
"""
import glob
import hashlib
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUR = os.path.join(ROOT, 'tools', 'en', 'puzzles.json')

# ---------------------------------------------------------------- reading and writing the data files


def load_call(path):
    """The JSON inside NIGHT_LOADED(...) or ARCHIVE_LOADED(n, ...)."""
    s = open(path, encoding='utf-8').read()
    head = s.index('(') + 1
    if s.startswith('ARCHIVE_LOADED'):
        head = s.index(',') + 1
    return json.loads(s[head:s.rindex(')')])


def write_call(path, call, data, arg=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    with open(path, 'w', encoding='utf-8') as f:
        f.write(f'{call}({arg},{body});\n' if arg is not None else f'{call}({body});\n')


# ---------------------------------------------------------------- locks, as js/data.js checks them


def normalize(s, lang):
    s = unicodedata.normalize('NFKD', str(s))
    s = re.sub('[̀-ͯ]', '', s).lower().strip()
    s = re.sub(r'\s+', ' ', s)
    for a in (['the ', 'an ', 'a '] if lang == 'en' else ['de ', 'het ', 'een ', "'n ", "'t "]):
        if s.startswith(a):
            s = s[len(a):]
            break
    return re.sub(r"[\s.,;:!?'\"()\-]+$", '', s).strip()


def h(salt, s):
    return hashlib.sha256((salt + s).encode('utf-8')).hexdigest()


# ---------------------------------------------------------------- sentences (as the pipeline split them)

NL_SENT = re.compile(r"(?<=[.!?])\s+(?=[A-Z'\"‘(])")
EN_SENT = re.compile(r"(?<=[.!?])\s+(?=[A-Z'\"‘“(])")   # the same, and the English opening quote


def sentences(s, rx):
    return [x.strip() for x in rx.split(s.strip()) if x.strip()]


def ws(s):
    return ' '.join(s.split())


ENDS_SENTENCE = re.compile(r"[.!?…][\"'”’)]*$")

# ---------------------------------------------------------------- fixed texts

FRAME = {
    'intro': ['You are the new assistant.', 'On the table lies a note from the collector.',
              'The key to the front door is in his coat, and he has gone home.',
              'The clock says a quarter past nine.', 'You begin to sort.'],
    'note_table': 'File twelve envelopes.\nCabinet five stays shut.\nLock up before twelve.\n— J.D.',
    'note_final': 'Well filed. Tomorrow at nine. — J.D.',
    'card_desk': {
        'kind': 'Legend',
        'description': 'In the Central Legend Archive there is a reading table with a green cloth, and on it a lamp '
                       'with a green shade. Along the wall stand five cabinets with drawers full of cards. In the '
                       'evening, when the others have gone, the assistant who worked late sits there and reads. Only '
                       'the hands can be seen in the lamplight.',
        'teller': 'the previous assistant',
        'note': 'Don’t read it. File it.',
    },
    'trail_notes': ['Not recorded by me. My previous assistant.', 'Same hand. He worked on into the evenings.',
                    'His last. No more cards from him after that.', 'This one he did not file. Nor did I.'],
    'card_five': {
        'kind': 'Legend',
        # the end is what js/game.js FIVE_ENDING[0] looks for, in its English (js/lang.js)
        'description': 'There was once a new assistant at the Legend Archive who stayed on one evening to finish the '
                       'filing. The collector had gone home. The assistant put four cabinets in order and then opened '
                       'the fifth as well, though it was to stay shut. After that the assistant was never seen '
                       'again. The cards lay neatly in order, and what the assistant saw there was ____.',
    },
    'final_words': ['nothing', 'me', 'myself', 'the assistant', 'the previous assistant'],
    'door_locked': 'Locked. The key is in J.D.’s coat.',
    'midnight': 'The clock strikes twelve.',
    'good_end': 'Well done. Cabinet five stays shut.',
    'nee': 'No.',
    'not_yet': 'Not yet.',
    'into_envelope': 'Into the envelope.',
    'archive_note': 'You need not go behind the divider tonight.',
    'finish_first': 'Not yet. Cabinet {roman} first.',
    'digit_note': '{n}. The number of cabinet {roman}.',
    'digit_first': 'Remember: the lock of cabinet V wants four of these.',
    'found_notes': {
        'chair': 'One is where I put it down yesterday.',
        'lamp': 'One is under the lamp. Don’t move the lamp.',
        'coat': 'One is in my coat. Leave the coat hanging.',
        'typewriter': 'One is still in the machine.',
    },
    'floor_note': 'That one does not belong in that drawer.',
    'machine_continued': '— continued in drawer 3 —',
    'reactions': {
        'reopen_filed': 'That one was done.',
        'stalled': 'Hurry up.',
        'read_desk': 'I said: don’t read it.',
        'typo3': 'It is there. Read.',
        'other_hand': 'he is not coming back',
        'five_shut': 'Shut.',
    },
    'citation': 'Source: Dutch Folktale Database (Nederlandse Volksverhalenbank), Meertens Institute (KNAW), '
                'www.verhalenbank.nl',
}
LABELS = {'Voortekenen': 'Omens', 'Witte wieven': 'White Women', 'Weerwolven': 'Werewolves', 'Spoken': 'Ghosts',
          'De duivel': 'The Devil'}
NOTES = {
    'Alle vier noemen ze hetzelfde ding. Dat wordt het etiket. Niet ‘een beest’ schrijven.':
        'All four name the same thing. That becomes the label. Don’t write ‘a beast’.',
    'Zonder plaats. Ergens tussen de andere drie. Prik hem op de kaart.':
        'No place. Somewhere between the other three. Pin it on the map.',
    'Eén hoort hier niet. Terug naar zijn eigen kast.': 'One does not belong here. Back to its own cabinet.',
    'Doorgescheurd. De rest ligt in de doos op tafel.': 'Torn in two. The rest is in the box on the table.',
    'De vertellers spreken elkaar tegen. Houd de oudste aan.': 'The tellers contradict each other. Go by the oldest.',
    'Elk verhaal één getal. In deze volgorde.': 'Each story one number. In this order.',
    'De klok staat stil. Deze drie weten hoe laat het is.': 'The clock has stopped. These three know the time.',
    'Er staat iets op het raam. Niet afvegen.': 'Something is written on the window. Don’t wipe it off.',
    'Als er geklopt wordt: tel. Die kaart onder de deur.': 'When someone knocks: count. That card under the door.',
    'Als de machine begint: laten uittikken. Het vervolg zit hierin.':
        'When the machine starts: let it type to the end. The rest is in here.',
}
HINTS = {
    'Lees de vier nog eens. Let op wat er in elk van de vier vóórkomt, niet op wat erin gebeurt.':
        'Read the four again. Look at what occurs in each of the four, not at what happens in them.',
    'Drie plaatsen staan er al. De vierde ligt daartussen.': 'Three places are there already. The fourth lies between them.',
    'Drie kaarten vertellen in wezen hetzelfde. De vierde niet.': 'Three cards tell essentially the same thing. The fourth does not.',
    'Kijk naar de nummers in rood potlood.': 'Look at the numbers in red pencil.',
    'Lees het bovenste stuk tot het laatste woord. Wat wordt er al genoemd?': 'Read the top piece to the last word. What is mentioned already?',
    'Het bovenste stuk breekt midden in een zin af. Het onderste maakt hem af.': 'The top piece breaks off in mid-sentence. The bottom one finishes it.',
    'Kijk naar de jaartallen.': 'Look at the years.',
    'Elk verhaal telt.': 'Each story counts.',
    'Lees ze nog eens. Ze tellen alle drie iets.': 'Read them again. All three count something.',
    'Drie keer hetzelfde getal. Zo laat is het.': 'The same number three times. That is the time.',
    'Lees het van achteren naar voren.': 'Read it from back to front.',
    'Wacht op het kloppen. Tel het.': 'Wait for the knocking. Count it.',
    'Een oneven getal.': 'An odd number.',
    'Een even getal.': 'An even number.',
    'Lees wat de machine getypt heeft, tot het laatste woord.': 'Read what the machine has typed, to the last word.',
    'De machine stopt midden in een zin. Het vervolg maakt hem af.': 'The machine stops in mid-sentence. The rest finishes it.',
}
KINDS = {'voorwerp': 'an object', 'beroep': 'a profession', 'dier': 'an animal', 'gebouw': 'a building',
         'tijdstip': 'a time of day'}
SUBJECTS = {'de duivel': 'the devil', 'een spook': 'a ghost', 'een weerwolf': 'a werewolf',
            'een witte vrouw': 'a white woman', 'een voorteken': 'an omen'}
BELONGS = {'Witte wieven': 'the White Women', 'Weerwolven': 'the Werewolves', 'Spoken': 'the Ghosts',
           'duivel': 'the Devil', 'Voortekenen': 'the Omens'}
NUMBERS = {'een': 'one', 'één': 'one', 'twee': 'two', 'drie': 'three', 'vier': 'four', 'vijf': 'five', 'zes': 'six',
           'zeven': 'seven', 'acht': 'eight', 'negen': 'nine', 'tien': 'ten', 'elf': 'eleven', 'twaalf': 'twelve'}
LANGS = {'Standaardnederlands': 'Standard Dutch', 'Fries': 'Frisian', 'Fries (Woudfries)': 'Frisian (Woudfries)',
         'Gronings': 'Groningen dialect', 'Liemers': 'Liemers dialect', 'Twents': 'Twente dialect',
         'Limburgs': 'Limburgish', 'Brabants': 'Brabant dialect', 'Noord-Brabants': 'North Brabant dialect',
         'Utrechts': 'Utrecht dialect', 'Gendts (Achterhoeks)': 'Gendt dialect (Achterhoek)',
         'Gelders': 'Gelderland dialect', 'Zeeuws': 'Zeelandic', 'Drents': 'Drents',
         'Zuid-Hollands': 'South Holland dialect', 'Waterlands': 'Waterland dialect'}
P5_SUMMARY = re.compile(r'^In (.+) werd een (voorwerp|dier) gezien: ____\. \(volgens de oudste opname\)$|'
                        r'^In (.+) werd een tijdstip genoemd: ____\. \(volgens de oudste opname\)$')


def lang_en(s):
    return '; '.join(LANGS[p.strip()] for p in s.split(';'))


def word_in(word, text):
    """Is this word (or its plural) in the text, as a word?"""
    w = re.escape(word.lower())
    return re.search(rf"(?<![a-z]){w}(s|es)?(?![a-z])", text.lower()) is not None


# ---------------------------------------------------------------- the build


class Build:
    def __init__(self):
        self.cur = json.load(open(CUR, encoding='utf-8'))
        self.tr = {}
        for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'translations', '*.opus.json'))):
            self.tr.update(json.load(open(f, encoding='utf-8')))
        self.tr.update(self.cur.get('fixes', {}))
        self.arch = {}  # record code -> archive entry
        self.archive = {}
        for n in range(1, 6):
            lst = load_call(os.path.join(ROOT, 'data', 'archive', f'cabinet-{n}.js'))
            self.archive[n] = lst
            for a in lst:
                self.arch[a['r']] = a
        self.problems = []

    def say(self, where, what):
        self.problems.append(f'{where}: {what}')

    def en_of(self, n, where):
        t = self.tr.get(str(n))
        if t is None:
            self.say(where, f'no translation for story {n}')
        return t

    # a torn summary: the same tear in the English
    def halves(self, a, piece, half, where):
        d = ws(a['d'])
        p = ws(piece)
        if half == 'top':
            if not d.startswith(p):
                return self.say(where, f'top half not at the start of story {a["n"]}')
            k = len(p)
        else:
            k = d.find(p)
            if k < 0:
                return self.say(where, f'bottom half not in story {a["n"]}')
            k = len(d[:k].rstrip())   # the tear is where the top half ends
        key = f'{a["n"]}:{k}'
        if key in self.cur['halves']:
            # by hand: the words the English bottom half starts with (or both halves in full)
            v = self.cur['halves'][key]
            if isinstance(v, list):
                return v
            en = ws(self.en_of(a['n'], where) or '')
            i = en.find(v)
            if i <= 0:
                return self.say(where, f'halves {key}: {v!r} not in the English')
            return [en[:i].strip(), en[i:].strip()]
        top = d[:k].strip()
        en = self.en_of(a['n'], where)
        if en is None:
            return None
        if not ENDS_SENTENCE.search(top):
            return self.say(where, f'halves {key} torn mid-sentence: add them by hand')
        i = len(sentences(top, NL_SENT))
        nl_all, en_all = sentences(d, NL_SENT), sentences(ws(en), EN_SENT)
        if len(nl_all) != len(en_all):
            return self.say(where, f'halves {key}: {len(nl_all)} Dutch sentences, {len(en_all)} English: add them by hand')
        return [' '.join(en_all[:i]), ' '.join(en_all[i:])]

    def word_entry(self, kind, lock, where):
        """The curated entry (p1 or p5) whose Dutch answers this lock accepts."""
        for e in self.cur[kind]:
            if any(h(lock['salt'], normalize(x, 'nl')) in lock['accepted_hashes'] for x in e['nl']):
                return e
        self.say(where, f'no {kind} entry opens this lock')

    def card_text(self, card, d, where):
        """The English of a card's description (the halves come later, per drawer)."""
        r = card['render']
        if card['role'] == 'summary':
            m = P5_SUMMARY.match(r['description'])
            if not m:
                return self.say(where, f'unknown P5 summary {r["description"]!r}')
            if m.group(3):
                return f'In {m.group(3)} a time of day was mentioned: ____. (according to the oldest recording)'
            return f'In {m.group(1)} {KINDS[m.group(2)]} was seen: ____. (according to the oldest recording)'
        a = self.arch.get(card['story_id'])
        if not a:
            return self.say(where, f'story {card["story_id"]} not in the archive')
        if r.get('half'):
            return None
        if ws(r['description']) != ws(a['d']):
            return self.say(where, f'card {card["id"]} is not its story\'s summary')
        return self.en_of(a['n'], where)

    def drawer(self, d, cab, seed):
        where = f'{seed} {d["id"]} {d["type"]}'
        t = d['type']
        e = json.loads(json.dumps(d))
        e['note'] = NOTES[d['note']]
        cards = {c['id']: c for c in e['cards']}
        en = {}
        for c in d['cards']:
            txt = self.card_text(c, d, where)
            if txt is not None:
                en[c['id']] = txt
        # torn cards
        torn = {}
        for c in d['cards']:
            r = c['render']
            if r.get('half'):
                a = self.arch.get(c['story_id'])
                hv = a and self.halves(a, r['description'], r['half'], where)
                if hv:
                    torn[c['id']] = hv
                    en[c['id']] = hv[0] if r['half'] == 'top' else hv[1]
        if len(en) != len(d['cards']):
            return None
        for cid, txt in en.items():
            r = cards[cid]['render']
            r['description'] = txt
            if r.get('front'):
                r['front'] = 'description'   # the English on the front, the original telling on the back
            if r.get('lang'):
                r['lang'] = lang_en(r['lang'])
            if r.get('note'):
                r['note'] = 'This one I keep apart.'
        # hints, and what each puzzle needs to hold in English
        hints = []
        for x in d['hints']:
            hints.append(self.hint(x, d, e, en, torn, where))
        if None in hints:
            return None
        e['hints'] = hints
        ok = self.check(d, e, en, torn, where)
        os_ = e.get('on_success', {})
        if 'type_line' in os_:
            os_['type_line'] = 'Told by: the previous assistant.'
        dg = os_.get('digit')
        if dg and dg.get('word'):
            dg['word'] = NUMBERS[dg['word'].lower()]
        for c in e['cards']:
            if c['render'].get('stain'):
                c['render']['stain'] = NUMBERS[c['render']['stain'].lower()]
                if not word_in(c['render']['stain'], c['render']['description']):
                    self.say(where, f'stain word {c["render"]["stain"]!r} not on card {c["id"]}')
                    ok = False
        return e if ok else None

    def hint(self, x, d, e, en, torn, where):
        if x in HINTS:
            return HINTS[x]
        t = d['type']
        m = re.match(r'^Het is een (\w+)\.$', x)
        if m:
            return f'It is {KINDS[m.group(1)]}.'
        m = re.match(r'^Begint met een (\w)\. (\d+) letters\.$', x)
        if m:
            ans = self.word_entry('p1', d['lock'], where)
            if not ans:
                return None
            a = ans['en']
            return f'Begins with {a[0].upper()}. {len(a.replace(" ", ""))} letters.'
        m = re.match(r'^Binnen (\d+) uur lopen van (.+)\.$', x)
        if m:
            n = int(m.group(1))
            return f'Within an hour’s walk of {m.group(2)}.' if n == 1 else f'Within {n} hours’ walk of {m.group(2)}.'
        m = re.match(r'^Zoek (.+) op de kaart\.$', x)
        if m:
            return f'Find {m.group(1)} on the map.'
        m = re.match(r'^De vierde gaat over (.+)\.$', x)
        if m:
            return f'The fourth is about {SUBJECTS[m.group(1)]}.'
        m = re.match(r'^De kaart over (.+) hoort bij (?:de )?(.+)\.$', x)
        if m:
            return f'The card about {m.group(1)} belongs with {BELONGS[m.group(2)]}.'
        m = re.match(r'^(Het onderste stuk|Het vervolg) noemt ‘(.+)’ opnieuw\.$', x)
        if m:
            cue = self.cue(m.group(2), d, torn, where)
            if not cue:
                return None
            return f'{"The bottom piece" if m.group(1) == "Het onderste stuk" else "The rest"} mentions ‘{cue}’ again.'
        m = re.match(r'^Het nummer is (.+)\. Er zijn er (drie met dat nummer in de doos|maar drie in de envelop)\.$', x)
        if m:
            tail = 'three with that number in the box' if m.group(2).startswith('drie') else 'only three in the envelope'
            return f'The number is {m.group(1)}. There are {tail}.'
        m = re.match(r'^De oudste is uit (\d+)\.$', x)
        if m:
            return f'The oldest is from {m.group(1)}.'
        m = re.match(r'^Op die kaart staat een (\w+)\. Welk\?$', x)
        if m:
            return f'That card names {KINDS[m.group(1)]}. Which?'
        m = re.match(r'^Het eerste getal is (\d+)\.$', x)
        if m:
            return f'The first number is {m.group(1)}.'
        if re.match(r'^\d+ — \d+ — \d+\.$', x):
            return x
        m = re.match(r'^(\d+) uur\. Zet de klok\.$', x)
        if m:
            return f'{m.group(1)} o’clock. Set the clock.'
        m = re.match(r'^Het begint met een (\w)\.$', x)
        if m:
            return f'It begins with {m.group(1)}.'
        m = re.match(r'^(.+)\. Leg die kaart op de vensterbank\.$', x)
        if m:
            return f'{m.group(1)}. Lay that card on the windowsill.'
        m = re.match(r'^(\d+) keer\. Die kaart\.$', x)
        if m:
            return f'{m.group(1)} times. That card.'
        self.say(where, f'no English for hint {x!r}')

    def cue(self, nl, d, torn, where):
        lock = d['lock']
        top, bottom = lock['top_card'], lock['bottom_card']
        a = self.arch[next(c for c in d['cards'] if c['id'] == top)['story_id']]
        cue = self.cur['cue_fix'].get(f'{a["n"]}:{nl}') or self.cur['cues'].get(nl)
        if not cue:
            return self.say(where, f'no English for the shared word ‘{nl}’ (story {a["n"]})')
        hv = torn.get(top)
        if hv and not (word_in(cue, hv[0]) and word_in(cue, hv[1])):
            return self.say(where, f'‘{cue}’ ({nl}) is not in both halves of story {a["n"]}: {hv}')
        # the other halves must not name it, or the hint picks out more than one
        for c in d['cards']:
            if c['id'] not in (top, bottom) and c['render'].get('half') == 'bottom' and c['id'] in torn \
                    and word_in(cue, torn[c['id']][1]):
                self.say(where, f'‘{cue}’ is also in the other half {c["id"]} (story {c["story_id"]})')
        return cue

    def check(self, d, e, en, torn, where):
        t, lock, ok = d['type'], d['lock'], True
        if t in ('P1', 'P5'):
            ans = self.word_entry('p1' if t == 'P1' else 'p5', lock, where)
            if not ans:
                return False
            lock['accepted_hashes'] = sorted({h(lock['salt'], normalize(x, 'en')) for x in ans['accept']})
            e['lock'] = lock
            if t == 'P1':
                for c in d['cards']:
                    if not any(word_in(x, en[c['id']]) for x in ans['accept']):
                        self.say(where, f'P1 ‘{ans["en"]}’: not on card {c["id"]} (story {c["story_id"]}): {en[c["id"]]}')
                        ok = False
            else:
                vs = [c for c in d['cards'] if c['role'] == 'variant']
                old = min(vs, key=lambda c: c['render']['year'])
                if not any(word_in(x, en[old['id']]) for x in ans['accept']):
                    self.say(where, f'P5 ‘{ans["en"]}’: not on the oldest card {old["id"]} (story {old["story_id"]}): {en[old["id"]]}')
                    ok = False
        if t == 'P4' or t == 'R4':
            hv = torn.get(lock['top_card'])
            route_sentence = any('midden in een zin' in x for x in d['hints'])
            if hv and route_sentence and ENDS_SENTENCE.search(hv[0]):
                self.say(where, f'the top half should break off in mid-sentence: {hv[0]!r}')
                ok = False
        return ok

    def frame(self, f):
        e = json.loads(json.dumps(f))
        for k, v in FRAME.items():
            if isinstance(v, dict):
                e[k].update(v)
            else:
                e[k] = v
        return e

    def night(self, path):
        b = load_call(path)
        seed = b['seed']
        e = {**b, 'frame': self.frame(b['frame']), 'cabinets': []}
        good = True
        for c in b['cabinets']:
            ce = {**c, 'label': LABELS[c['label']], 'drawers': []}
            for d in c['drawers']:
                de = self.drawer(d, c, seed)
                good = good and de is not None
                if de is None and DRAFT:
                    de = d
                ce['drawers'].append(de)
            e['cabinets'].append(ce)
        return e if good or DRAFT else None

    def run(self, write):
        nights = sorted(glob.glob(os.path.join(ROOT, 'data', 'nights', '1*.js')))
        done = 0
        for p in nights:
            e = self.night(p)
            if e and write:
                write_call(os.path.join(ROOT, 'data', 'nights', 'en', os.path.basename(p)), 'NIGHT_LOADED', e)
            done += e is not None
        missing = 0
        for n, lst in self.archive.items():
            out = []
            for a in lst:
                t = self.tr.get(str(a['n']))
                missing += t is None
                out.append({**a, 'd': t if t is not None else a['d']})
            if write:
                write_call(os.path.join(ROOT, 'data', 'archive', 'en', f'cabinet-{n}.js'), 'ARCHIVE_LOADED', out, n)
        for p in sorted(set(self.problems)):
            print(p)
        print(f'{done} of {len(nights)} nights in English; {missing} archive summaries still in Dutch'
              + ('' if write else ' (nothing written)'))


DRAFT = '--draft' in sys.argv

if __name__ == '__main__':
    Build().run(write='--check' not in sys.argv)
