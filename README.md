# Study Hub

Turn photos of your notes (or a typed topic) into **quizzes** and **cue cards**. Projects are saved in your browser.

## Run it

```
node server.js        # needs Node 18+; no npm install required
```

Open http://localhost:3000.

## Turn on the AI (free)

1. Sign in at https://build.nvidia.com (free NVIDIA Developer Program) and click **Get API Key** on any model page.
2. Copy `.env.example` to `.env` and paste the key (starts with `nvapi-`).
3. Restart `node server.js`. The header chip changes from "Basic mode" to "AI on".

The key stays on the server and is never sent to the browser. The free tier is rate-limited (about 40 requests/minute), and the server stays under that. Model IDs change over time; set `NVIDIA_MODEL` / `NVIDIA_VISION_MODEL` in `.env` to other models from the catalog if needed (the vision one must accept images).

Free hosted endpoints may log what you send, so don't upload anything private.

## Basic mode (no key)

Photos are read on your device with Tesseract.js and questions come from simple rules. It works, but the questions are simpler than AI-written ones.

## Using it

- **Add project** then choose **Cue cards** or **Quiz**.
- Quiz: pick University / College / Academic / Applied, then add photos, notes, and/or a topic, plus any details to focus on.
- Cue cards: every point in the notes gets a card. Type your answer or tap the card to flip it. There is no score; "Review again" just marks cards for another pass.
- Photos are read first and shown to you to correct before anything is generated.

## Deploy to Vercel
1. Push this folder to a GitHub repo (`.env` is git-ignored, so your key is not uploaded).
2. On vercel.com choose Add New > Project, import the repo, and keep the defaults (no build step).
3. Under Environment Variables add `NVIDIA_API_KEY` (your `nvapi-` key). Optionally add `NVIDIA_MODEL` and `NVIDIA_VISION_MODEL`.
4. Deploy. You can also use the CLI: `npx vercel --prod`.

Notes: Vercel caps request bodies at 4.5MB, so photos are sent one per request. Anyone with the link can use your key, so keep the URL private or turn on Vercel Deployment Protection.

## Faster text with Groq (optional)
Make a free key at console.groq.com and add it as `GROQ_API_KEY` (in `.env`, or in Vercel under Settings > Environment Variables). Cards and quizzes then go to Groq first and fall back to NVIDIA if Groq is busy or rate limited. Photos still use NVIDIA, so keep `NVIDIA_API_KEY` too. Set `GROQ_MODEL` to change the model (a comma-separated list is tried in order).

## Checking the AI connection
Open `/api/test` on your site (or use Settings > Test AI connection). It sends a tiny request to every model the site can use and shows the status and any error. Keys are never shown.

## PDFs and text files
In the wizard, "Upload PDF or text file" reads a PDF on your device (nothing is uploaded; pdf.js is bundled in `public/vendor/pdfjs`). You choose a page range, and the text goes into the notes box so you can edit it. Pages with no text (scans) are treated like photos. For a whole subject, do one chapter at a time: each project uses up to about 40,000 characters, and every ~2,000 characters is one AI request. For a Google Doc, use File > Download > PDF first.

## Diagram questions
If your notes are about cells (animal cell, plant cell, neuron) or about functions (domain and range, parabolas, square root, absolute value, reciprocal, linear), quizzes and cue cards add a few questions that need a picture. The site draws the picture itself and works out the answer in code, so the arrow and the numbers are always exact. Function graphs show hollow or filled dots for open or closed ends. There are no standalone diagram pages.

## Diagrams for any topic

Cells, neurons and function graphs are drawn by the site itself, so the arrow and the numbers are exact. For other topics (the heart, a circuit, the water cycle, and so on) the AI designs a simple picture out of plain shapes while it writes the quiz or cards. The site checks every shape and label before drawing, and a question can only point at a spot that sits on a shape. AI pictures need AI mode (a Groq or NVIDIA key); in basic mode only the built-in pictures appear. AI-drawn pictures can be wrong or crude, so each one has a "This diagram looks wrong, skip it" button that removes the question from the quiz and the project.

## Diagram pictures for maths, physics and biology

Quizzes and cue cards add picture questions when your notes mention the topic. Everything is drawn by the site from the same numbers that make the answers, so the arrow, the graph and the answer always agree. The AI is not used for pictures.

- **Maths (Grade 11 functions):** areas with algebraic and radical sides, the discriminant and number of roots, parabola word-problem graphs, domain and range from piecewise graphs with open and closed dots, angles of elevation and depression, the CAST diagram, reciprocal ratios, the image of a point under a transformation, inverses of parabolas, reading values off graphs (f(2), f(x) = 3, intercepts), vertical line test, circles, mapping diagrams, transformations, inverses, right and special triangles, angles in standard position and CAST, the unit circle, the sine law, cosine law and ambiguous case, sinusoidal graphs, exponential graphs, sequences and Pascal's triangle.
- **Physics:** free body diagrams (net force, acceleration), velocity-time and position-time graphs, waves, and series and parallel circuits. This is a general high-school set, not matched to a course outline.
- **Biology:** animal and plant cells, neuron, DNA, a bacteriophage, a virus, a bacterium, a flower and a mushroom (an arrow points to a part), plus stages of mitosis and meiosis, the cell cycle, Punnett squares (single, dihybrid, incomplete dominance, blood types, sex-linked), pedigrees, karyotypes and the levels of classification.

A topic only gets pictures when the notes use its words (for example "free body diagram" or "Punnett square"). Plain history or English notes get none. To add another picture, add a maker to `public/js/diagramq2.js`, `diagramq3.js` or `diagramq4.js`, a drawing to `diagrams2.js`, and a detection rule to `diagramtopics.js`.

## Real diagrams from Wikimedia Commons

For topics the code cannot draw itself (photosynthesis, the water, carbon and nitrogen cycles, the heart and other body systems, plate tectonics, bonding, lenses and similar), cue cards and quizzes can include a real labelled diagram found on Wikimedia Commons. It needs no key.

- `api/_commons.js` searches Commons for SVG or PNG diagrams, keeps only openly licensed ones (CC, public domain), and only files whose name or description contains the topic's words. `api/image.js` and `server.js` expose it as `GET /api/image?q=topic`.
- `public/js/figures.js` picks topics from the notes and builds the cards ("What does this diagram show?") and multiple choice questions. The wrong answers come from other topics.
- Every picture shows a credit line linking to its Commons page, on a white panel so it reads on the black theme.
- If the lookup fails, the cards and quizzes are made without the pictures. Maths, physics and biology diagrams drawn by code are unchanged.

## Decorative project banners (optional)

If `HF_TOKEN` (a free Hugging Face token) is set, each project page gets an illustrated banner made by FLUX (`HF_IMAGE_MODEL` can change the model). It is only decoration and never part of a question or answer.

- `api/_art.js` and `api/art.js` (also `server.js`) make one picture per project name and send it with a one-year cache header, so it is generated once and then reused by the browser and Vercel.
- `public/js/art.js` reserves the space first, shows a slow shimmer, and fades the picture in when it has loaded, so nothing jumps. Reduced-motion users get no animation. If the picture fails, the banner just disappears.
- Home tiles show a thumbnail only after that banner has loaded once.
- Without the token nothing is shown and nothing is requested.

## How many pictures a quiz or card set gets

There is no fixed percentage. `pictureShare()` in `public/js/diagramq.js` averages how picture-heavy each detected topic is (`DENSITY` in `diagramtopics.js`: labelling cells or graphing is high, sequences and taxonomy are low), adds a little for words like "diagram" or "sketch" in the notes, and varies it slightly each time. Notes with no picture topics get none. Quizzes use it as the share of questions and cue cards as the share of the set (never fewer than three). Edit the numbers in `DENSITY` to tune a topic.

## Looks (Settings → Look)

Ten looks to pick from, each with a small preview drawn in its own colours: Midnight Violet (default), Daylight, Forest Mint, Notebook Paper, Neon Arcade, Slate Glass, Deep Ocean, Sunset, Blossom and Starfield. The choice is saved in the browser. The colours are CSS variables under `[data-theme="<id>"]` in `public/css/styles.css`; `public/js/themes.js` lists the names. To add one, add a block in the CSS and an entry in the list. Every look passes a 4.5:1 text contrast check.

Unit 3 lesson 3-3 (`props` in `diagramq2.js`): graphs of y = √x and y = 1/x with domain and range, asymptotes, end behaviour (as x → 0⁺, as x → −∞), quadrants and intercepts.

## Multiple choice safety net

`public/js/options.js` removes options that read the same (for example "-2" and "−2", or "−2.0"), keeps the right answer, and drops any question left with fewer than two different options. It runs on AI-written questions (`ai.js`), on the picture questions (`diagramq.js`, which skips a problem and takes the next one) and on the finished quiz (`pipeline.js`).

## Difficulty (Easy, Medium, Hard)

Quizzes have a difficulty, picked when you set the quiz up and changeable later with the "Difficulty" button on the quiz page, which rebuilds the questions from the saved notes (same topics, same length and question types). The levels and their descriptions are in `DIFFICULTY` in `public/js/prompts.js`.

- AI mode: the level is added to the prompt (easy is direct recall with clearly different wrong options; hard is multi-step with wrong options close to the answer).
- Basic mode (`generate.js`): easy leans to multiple choice and true/false and picks wrong options that look different; hard leans to typed answers and picks wrong options that look like the right one.
- Picture questions (`diagramq.js`): each question gets a hardness score (longer wording, more numbers, longer answers, several-step wording, look-alike wrong options), and each topic uses its easiest, middle or hardest questions. The topics themselves do not change.
