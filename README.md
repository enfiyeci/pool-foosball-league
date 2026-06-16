# Pool & Foosball League

A web app for tracking pool and foosball matches in an office or friend group, with an [Elo](https://en.wikipedia.org/wiki/Elo_rating_system) rating system that ranks players over time.

**Live demo: [enfiyeci.github.io/pool-foosball-league](https://enfiyeci.github.io/pool-foosball-league/)**

## Features

- **Match submission** with a pending-approval queue, so results are confirmed before they affect ratings
- **Elo rankings** updated after every approved match (starting rating 1200, K-factor 32)
- **Match history** and **per-player profiles** with win/loss records
- **Separate ladders** for pool and foosball
- **"How Elo works"** explainer page for players new to the rating system
- Responsive layout with a mobile menu

## How the rating works

Every player starts at **1200**. After each match the winner gains and the loser loses points based on the expected outcome:

```
expected_winner = 1 / (1 + 10^((rating_loser - rating_winner) / 400))
new_rating      = old_rating + K * (actual - expected)      // K = 32
```

Beating a higher-rated opponent moves your rating more than beating a lower-rated one, so the ladder converges on true skill over time.

## Tech stack

- Vanilla JavaScript, HTML, and CSS (no framework)
- **Firebase Realtime Database** for shared, live-updating match and player data
- Hosted on **GitHub Pages**

## Running locally

```bash
git clone https://github.com/enfiyeci/pool-foosball-league.git
cd pool-foosball-league
# open index.html in a browser, or serve it:
python3 -m http.server 8000
```

The deployed version uses a Firebase project for shared state. To run your own instance, create a Firebase Realtime Database and drop your config into the Firebase initialization in `index.html`.
