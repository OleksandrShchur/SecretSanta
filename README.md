# Secret Santa 🎅
**A simple, client-side Secret Santa generator** that randomly assigns gift recipients with no self-assignments and a single closed loop. Runs entirely in the browser—no backend, no data stored.

The project allows participants to be randomly assigned a recipient while ensuring each person both gives and receives exactly one gift.

## Live Demo

The application is available online via GitHub Pages:

https://oleksandrshchur.github.io/SecretSanta/

## Features

- Random Secret Santa assignment
- No self-assignment
- Deterministic, transparent logic
- Client-side only (no backend, no data persistence)
- Works directly in the browser

## Tech Stack

- HTML
- CSS
- JavaScript
- GitHub Pages for hosting

## Project Structure

- index.html # Main entry point
- styles.css # Styles
- app.js # Application logic


## How It Works

1. Users provide a list of participant names.
2. The algorithm shuffles the list.
3. Each participant is assigned the next person in the shuffled order.
4. The last participant is assigned the first one.
5. The result guarantees:
   - No duplicates
   - No self-assignments
   - Closed loop distribution

## Running Locally

Clone the repository and open `index.html` in a browser:

```bash
git clone https://github.com/OleksandrShchur/SecretSanta.git
cd SecretSanta

No build step or server is required.

Deployment

The project is deployed using GitHub Pages from the repository itself.
No custom domain is configured.

Default GitHub Pages URL format is used.
