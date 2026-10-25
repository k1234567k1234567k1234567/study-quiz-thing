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
