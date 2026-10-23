# Nachtdienst — the painted version

A 2D puzzle game after [Nachtdienst](https://github.com/fbkarsdorp/nachtdienst), the three.js escape room in the
Centraal Sagenarchief, painted in the manner of the
[Claude Animation Base](https://github.com/JohnHeibel/ClaudeAnimationBase): brush and ink, flat 2D, linework that
boils twelve times a second. You are on night duty yourself, drawn after a portrait; an archive cat and Clawd, the
Animation Base's character, are one URL parameter away.

1983. J.D. has gone home and left a note on the reading table: *"Twaalf enveloppen invoegen. Kast vijf blijft
dicht. Sluit af vóór twaalven."* Four card cabinets, three drawers each: two card puzzles and one *room lock*, a
thing in the room that is the lock (the clock, the window, the door, the typewriter). Solving a lock is knowing;
inserting the cards is filing, and only filing counts. The cabinet you are working on leaks into the room until it
is filed. Nobody explains that.

The puzzles are the original game's, night for night: the 120 nights in `data/nights/` are the bundles its pipeline
made from the Nederlandse Volksverhalenbank, and the archive behind the dividers is the same 9,659 stories.

## Playing

Open `index.html` in a browser. It is a static page with no build step, and it also runs from a double-clicked file.
`./serve.sh` serves it on <http://localhost:8137/> if you prefer. Before publishing a change, run `./stamp.sh`:
it stamps a new version into `index.html`, so browsers fetch the new files at once instead of keeping the old ones
(the version is pencilled on the colophon card).

Use headphones: the room is mostly sound.

- **Click a thing in the room** and you walk to it. Esc or right-click steps back.
- **At a cabinet**, take the envelope of the drawer whose turn it is. It goes to the reading table.
- **On the table**, open the envelope. The cards stand in the tray: click one to read it (F turns it over, ← → go
  through them), **Op tafel** lays it down, **Meenemen** takes it in the hand. What is written on the envelope is
  the task. **Vraag J.D.** adds a pencil hint and costs 2, 4, then 8 minutes on the clock.
- **The hand** holds one card or one envelope. Carry a card to a cabinet, the windowsill, the foot of the door or
  the typewriter.
- **When a lock opens** the cards slide back into the envelope and its flap shuts. Carry it to its drawer: the cards
  are inserted, the stamped envelope goes onto the spike. That spike is the only progress bar.
- H shows the instructions again, M turns the sound off.

### On a phone

Hold the phone sideways (with the rotation lock on, an upright phone shows the room turned a quarter, so it can still
be read sideways). A tap leaves a ring of ink and, for a moment, the name of what was tapped; a tap just beside
something small still finds it. Swipe through the cards being read, or down to put them away. The phone's back button
or back swipe steps back in the room instead of leaving the archive. The screen stays on during a night, the night is
saved when the phone is put away, and on Android the heavier sounds come with a small vibration. Everything is tapped: the room's things, the tags, the drawn keys of the typewriter (which
has its own backspace, return and space bar on a phone, so the phone's keyboard never covers the room). On a small
screen the tags are drawn larger with taller tap areas, cards are read closer, and the help speaks of tapping. The
first tap asks for the whole screen in landscape where the browser allows it (Android); on an iPhone, add the page to
the home screen (Share → Zet op beginscherm) and it opens without the browser's bars. Sound plays through the silent
switch. Painted layers not shown for a few seconds give their memory back, which keeps a phone's canvas memory near
80 MB instead of 300.

### The puzzles

| | what you do | where |
|---|---|---|
| P1 *Het losse etiket* | four cards name one thing; type it | the typewriter |
| P2 *De kaart zonder plaats* | pin the missing place between the three others | the wall map (a loupe names the villages) |
| P3 *De verdwaalde kaart* | one card belongs elsewhere; take it to its own cabinet | the cabinets; this is the trail |
| P4 *De gescheurde kaart* | find the bottom half among the loose halves | the box on the table |
| P5 *De oudste verteller* | type the detail from the oldest telling | the typewriter |
| P6 *De cijfers* | each clipped card counts something; dial the three numbers | the strongbox |
| R1 the clock | it stops; set the hour all three omens count | drag the hour hand, leave it two seconds |
| R2 the window | a place is written in the mist, from outside | lay that card on the sill |
| R3 the door | something knocks; count | slide that card under the door |
| R4 the typewriter | it types half a card by itself | lay the other half on the machine |

Each room lock gives a digit. The four open cabinet V, if you choose to. Or stand at the door for a minute with
everything filed, and leave it shut.

## How it is made

There is no game engine and no library. `js/paint.js` is a small Canvas2D painter written for this: flat washes with
pooled edges and pigment granulation, watercolour fills built from layered deformed polygons (they bleed), pencil
hatching, and one tapered brush stroke per outline. Randomness is reseeded per element and per boil frame
(`boilSeed`), as in the Animation Base, so still things hold and drawn things wobble. Static scenery is painted once
into three boil drawings per layer and cycled at 12 fps (`Layer`), which is how the room runs at 60 fps.

The room is painted as by daylight and then darkened by a small lightmap: the desk lamp's pool, moonlight through
the window and on the floor, the corridor under the door (`lightmap` in `js/room.js`). The assistant and the table are lit
in their own pass so they stay readable in the dark (`litPass` in `js/views.js`).

Clawd (`js/clawd.js`) is a port of the Animation Base's character: the same model sheet, key views and drawn turns,
eyes, mouths and painted emotes, and the same acted emotion changes (anticipation, squint, take, settle), driven by
events instead of a timeline (`Mood`).

The cat (`js/cat.js`) takes exactly the same pose. It is a small model rather than
a drawing per view: ellipsoids for the haunches, chest, head and muzzle, cones for the ears, a tail and four legs, turned
to the key view and projected flat. Inks go down before washes, so overlapping parts close into one silhouette, the way
a cel is inked. The mood behind each pose is translated into what a cat does with it (`CATMOOD`): the ears prick or
flatten, the tail goes up, hooks into a question mark or wraps round the paws, the fur stands on end, the pupils go
round. It sits when it stops, trots when it walks, carries cards in its mouth, hops onto the reading table, arches its
back at a knock, purrs when left alone and curls up asleep after a while.

The person on duty by default (`js/person.js`) is built the same way, its colours sampled from the portrait and its
outlines (as in the portrait) a deeper shade of each part's own colour rather than black, in centimetres and at true scale against the
door and the cabinets: an oversized T-shirt with dropped shoulders over tattooed forearms (little motifs in fine line:
a face, a snake, a skull, a swallow), wide jeans with deep turned-up cuffs and cream socks, heavy laced shoes with
yellow welt stitching; a head with round glasses, heavy-lidded grey eyes that drift sideways, a moustache, freckles, and
curly hair stamped curl by curl over the scalp above the hairline. The person turns through every angle rather than
in drawn steps, breathes and shifts their weight when standing, and walks heel to toe. Arms reach their poses through the mood (`GESTURE`, `PMOOD`): hands on hips when proud, a scratch of the
head when confused, a hand to the chin when thinking, arms crossed, hands in pockets while humming, the head dropping
when sleepy. A card is carried in the hand. Because a grown-up is much taller than Clawd, the reading table and what
stands on it are raised to hip height while the person is on duty (`TABLE_RAISE`), and a cabinet is stood beside
rather than in front of. `?who=cat` and `?who=clawd` put the others on duty.

```
index.html         page
css/style.css      the letterbox, the fonts
js/core.js         palette, easing, springs, takes and hops (from the Animation Base)
js/paint.js        the medium: washes, watercolour, ink, pencil, glow, paper, boiled layers
js/clawd.js        Clawd: views, eyes, mouths, emotes, emotions, Mood
js/cat.js          the cat: the model, its poses and moods; who is on duty
js/person.js       the player: the model, gestures and moods, the face
js/audio.js        all sound synthesised, except the card and envelope recordings (Kenney, CC0)
js/data.js         loading a night; normalising and hashing answers (SHA-256); the gazetteer
js/room.js         the room: wall, cabinets, clock, window and canal, door, coat, table; the lightmap
js/cards.js        filing cards and envelopes in the house style: torn halves, stains, pencil, damp, crumpled
js/ui.js           paper tags, pencil notes, the strip, the hand, captions, help, iris and brush-wipe transitions
js/game.js         the night: drawer states, envelopes, the hand, filing, locks, hints, trail, saving
js/views.js        the room, the table, a cabinet up close, the archive behind the divider, the reader
js/views2.js       the map, typewriter, clock, window, door, cabinet V, halves, strongbox, title, endings
js/night.js        the director: leaks, room locks waking, enactments, reactions
js/feast.js        the real calendar outside: tonight's moon, and a few nights of the year (no spoilers)
js/dev.js          a back door for testing (below)
js/admin.js        the admin panel on top of it (?admin)
js/touch.js        the phone: fingertip reach, tap marks, swipes, back button, sideways, wake lock, vibration
js/main.js         boot, the frame loop, pointer and keys
data/              nights, map geometry, gazetteer, archive (converted from the original's game/data)
fonts/, sounds/    Special Elite, Caveat, Homemade Apple, IM Fell English; card sounds
```

- `?seed=1004` picks a night (any other name always maps to the same one).
- `?go&seed=1004` skips the title and the intro.
- `?who=cat` or `?who=clawd` puts the cat or Clawd on duty instead of you.
- `?rs=1.5` forces the render scale (it otherwise follows the screen, between 0.75 and 1.5).
- Progress is saved in `localStorage`; the title offers to resume.
- From the console: `DEV.take('2-1')`, `DEV.solve('2-1')`, `DEV.file('2-1')`, `DEV.cabinet(2)`, `DEV.go('map')`.
- `?admin` shows a ⚙ in the corner (only while it is in the address). Its panel picks a night
  and a date, plays, solves or files any drawer (filing what stands before it), files whole cabinets, skips the scenes
  between them, opens cabinet V, runs either ending, goes to any place in the room and sets the hour. Each drawer
  shows its last hint, which mostly gives the answer away.

Word and number answers are only in the bundles as salted SHA-256 hashes, as in the original; the game hashes what is
typed or dialled and compares.

## Sharing

`social/og-image.png` (1200×630) is what a shared link shows, through the Open Graph tags in `index.html`; they point
at the GitHub Pages address. `social/github-preview.png` (1280×640) is for the repository's own social preview, set
by hand under Settings → General → Social preview.

## Credits

Made by Folgert Karsdorp together with Claude (Anthropic). The person on duty is drawn after a portrait of Folgert
by Lauren Fonteyn. The game's own colophon is behind "Colofon" on the title screen and at the end of the night.

## Sources

- Stories: Nederlandse Volksverhalenbank, Meertens Instituut (KNAW), www.verhalenbank.nl. Each card's violet stamp
  links to its story.
- Puzzle bundles, map geometry (Natural Earth), gazetteer (GeoNames, CC BY 4.0) and the archive export: the original
  Nachtdienst pipeline.
- Card and envelope sounds: Kenney (kenney.nl), CC0.
- Clawd and the animation principles: Claude Animation Base. The cat, and the player after Lauren Fonteyn's portrait: drawn for this version.
- Fonts: Special Elite, Caveat, Homemade Apple, IM Fell English (Google Fonts, OFL).
