# Compass Clock Game Generator

A single-page web app that produces a compass clock (oval) navigation game for Scouts. It assigns letters to cones around an oval, computes their compass bearings, and prints quiz sheets for the patrols plus a solutions sheet for the leader.

Open `index.html` in a browser. No build step, no server.

## How it works

A patrol stands in the center of the oval. Each quiz card lists the bearings for one word. The patrol walks from the center along each bearing to the cone there, reads the letter on the cone, and fills it into the blanks on the card. The letters in order spell the target word.

## Inputs

| Setting | Default | Notes |
|---|---|---|
| Number of Cones | 24 | 4 to 36. Each cone gets one letter and one bearing. |
| Target Words | 15 sample words | One per line or comma separated. Every unique letter across the words needs its own cone. |
| Number of Quiz Sheets | 3 | How many full copies of the card set to print, one per patrol. |
| Split Words Across Sheets | off | When on, the words are round-robined across sheets instead of repeated, so each sheet holds a different word set. Sheet count caps at the word count. |
| Specific Letters to Include | empty | Extra letters to force onto the oval. |
| Randomize Letter Placement | on | Shuffles which letter sits on which bearing. |

## Output

- **Cone Layout & Letter Assignments**: the master table of cone number, bearing, and letter for the leader.
- **Quiz Sheets**: `Number of Quiz Sheets` copies of the card set. Cards show bearings and blanks, never the answers.
- **Solutions**: a single leader copy with the word, bearings, and filled-in letters.

Print everything with the **Print Game Sheets** button.

## Development

Run the unit tests with the Node built-in test runner:

```sh
npm test
```

The tests load `index.html`, extract its inline script, and drive `generateGame()` against a minimal DOM stub to assert on the generated markup.

## License

MIT. See `LICENSE`.