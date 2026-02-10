// Player list - Neos (new members)
const NEOS = [
    "Victoria Amore",
    "Sebastian Davis",
    "Nadia Duah",
    "Joshua Meshechok",
    "Agnes Batters",
    "Sarah Gebremeskel",
    "Jon Spahia",
    "Joshua Beckwith",
    "Eliana Goodman",
    "Chikwendu Okongwu",
    "Kai Chan-Van Der Helm",
    "Worth Bergeland",
    "Mark Doraszelski",
    "Liam Decker",
    "Amelie Breuninger"
];

// Player list - Brothers (existing members)
const BROTHERS = [
    "Jorge Luis Rodriguez",
    "Isabella Elena Barreira Bekanich",
    "Megha Narayanan Govindu",
    "Akeeliah Diajia Grey",
    "Agustina Hufschmid",
    "Eda Orakci",
    "Edgar Gustavo Rodriguez Moron",
    "Stefan Zaharia",
    "Amine Oueslati",
    "Pierce Haider",
    "Crosby Collins",
    "Evelyn Darling",
    "Federico Ramirez",
    "Ike Willis",
    "Jack Kramer",
    "Joelle Lewis-Taliaferro",
    "Kamelija Patoska",
    "Lucas Hudson",
    "Mokareoluwa Adewoye",
    "Moussa Dibassy",
    "Truth Woods",
    "Zachary Kirchhoff",
    "Arda Enfiyeci",
    "Juliana Li",
    "Jonathan Schwarz",
    "Drew Neiman",
    "Brittany Brown",
    "Achille Giaretta",
    "Sana Dezhabad",
    "Hannah Gong",
    "Lynn Yi",
    "Cheeks",
    "Tom Huang",
    "Rosemary Soule"
];

// Combined player list
const PLAYERS = [...NEOS, ...BROTHERS].sort();

// Helper to check if player is Neo or Brother
function isNeo(playerName) {
    return NEOS.includes(playerName);
}

function isBrother(playerName) {
    return BROTHERS.includes(playerName);
}

// Constants
const INITIAL_ELO = 1200;
const K_FACTOR = 32;

// Game modes
const GAME_MODES = {
    'pool-1v1': { name: '1v1 Pool', icon: '🎱', type: '1v1' },
    'foosball-1v1': { name: '1v1 Foosball', icon: '⚽', type: '1v1' },
    'pool-2v2': { name: '2v2 Pool', icon: '🎱', type: '2v2' },
    'foosball-2v2': { name: '2v2 Foosball', icon: '⚽', type: '2v2' }
};

// Data storage
let playerData = {};
let matchHistory = [];
let pendingMatches = [];
let playerPins = {};
let neoBrotherScore = { neo: 0, brother: 0 };
let firebaseReady = false;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    initializeNavigation();
    initializeForm();
    initializeRankings();
    initializeFilters();
    initializeCalculator();

    // Initialize with default data first so UI isn't empty
    initializeDefaultPlayerData();
    updateAllViews();

    // Wait for Firebase to be ready - check multiple ways due to module timing
    tryInitializeFirebase();
});

function tryInitializeFirebase() {
    console.log('tryInitializeFirebase called, window.firebaseDB:', !!window.firebaseDB, 'firebaseReady:', firebaseReady);

    if (firebaseReady) {
        console.log('Firebase already initialized');
        return;
    }

    if (window.firebaseDB) {
        console.log('window.firebaseDB exists, initializing Firebase');
        initializeFirebase();
    } else if (window.firebaseDBReady) {
        // Module has loaded but firebaseDB might not be set yet - wait a tick
        console.log('firebaseDBReady flag set but firebaseDB not found, waiting...');
        setTimeout(tryInitializeFirebase, 100);
    } else {
        console.log('Firebase not ready, adding event listener');
        window.addEventListener('firebase-ready', () => {
            console.log('firebase-ready event received');
            tryInitializeFirebase();
        });

        // Also poll as a fallback in case event was missed
        setTimeout(() => {
            if (!firebaseReady && window.firebaseDB) {
                console.log('Fallback: Firebase detected via polling');
                initializeFirebase();
            }
        }, 1000);
    }
}

// Expose for direct calling from module
window.initializeFirebase = initializeFirebase;

function initializeFirebase() {
    if (firebaseReady) {
        console.log('initializeFirebase called but already ready, skipping');
        return;
    }

    if (!window.firebaseDB) {
        console.error('initializeFirebase called but window.firebaseDB is not set!');
        return;
    }

    console.log('initializeFirebase: Setting up Firebase listeners');
    firebaseReady = true;
    const { database, ref, onValue } = window.firebaseDB;

    // Listen for player data changes
    onValue(ref(database, 'playerData'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Merge Firebase data with local player list to ensure all players and fields exist
            PLAYERS.forEach(player => {
                if (!data[player]) {
                    data[player] = {};
                }
                // Ensure all game modes exist for each player
                Object.keys(GAME_MODES).forEach(mode => {
                    if (!data[player][mode]) {
                        data[player][mode] = {
                            elo: INITIAL_ELO,
                            wins: 0,
                            losses: 0,
                            history: []
                        };
                    } else {
                        // Ensure all required fields exist (Firebase may not have history array)
                        if (data[player][mode].elo === undefined) data[player][mode].elo = INITIAL_ELO;
                        if (data[player][mode].wins === undefined) data[player][mode].wins = 0;
                        if (data[player][mode].losses === undefined) data[player][mode].losses = 0;
                        if (!Array.isArray(data[player][mode].history)) data[player][mode].history = [];
                    }
                });
            });
            playerData = data;
            console.log('Player data loaded from Firebase and normalized');
        } else {
            // Initialize with default data if empty
            console.log('No player data in Firebase, initializing defaults');
            initializeDefaultPlayerData();
            savePlayerDataToFirebase();
        }
        updateAllViews();
    }, (error) => {
        console.error('Firebase playerData error:', error);
        // Fallback to local data on error
        initializeDefaultPlayerData();
        updateAllViews();
    });

    // Listen for Neo vs Brother score
    onValue(ref(database, 'neoBrotherScore'), (snapshot) => {
        const data = snapshot.val();
        neoBrotherScore = data || { neo: 0, brother: 0 };
        updateNeoBrotherDisplay();
    }, (error) => {
        console.error('Firebase neoBrotherScore error:', error);
        neoBrotherScore = { neo: 0, brother: 0 };
    });

    // Listen for pending matches
    onValue(ref(database, 'pendingMatches'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            pendingMatches = Object.values(data).filter(m => {
                // Filter out expired matches (24h)
                return m.expiresAt && new Date(m.expiresAt) > new Date();
            });
            pendingMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
            pendingMatches = [];
        }
        updatePendingBadge();
        if (document.getElementById('page-pending')?.classList.contains('active')) {
            updatePendingMatchesUI();
        }
    }, (error) => {
        console.error('Firebase pendingMatches error:', error);
        pendingMatches = [];
    });

    // Listen for player PINs
    onValue(ref(database, 'playerPins'), (snapshot) => {
        const data = snapshot.val();
        playerPins = data || {};
    }, (error) => {
        console.error('Firebase playerPins error:', error);
        playerPins = {};
    });

    // Listen for match history changes
    onValue(ref(database, 'matchHistory'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Handle both array and object formats from Firebase
            if (Array.isArray(data)) {
                matchHistory = data;
            } else {
                // Firebase converts arrays with gaps to objects, so convert back
                matchHistory = Object.values(data);
            }
            // Sort by timestamp descending to ensure proper order
            matchHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
            matchHistory = [];
        }
        updateAllViews();
    }, (error) => {
        console.error('Firebase matchHistory error:', error);
        matchHistory = [];
        updateAllViews();
    });
}

function initializeDefaultPlayerData() {
    PLAYERS.forEach(player => {
        playerData[player] = {};
        Object.keys(GAME_MODES).forEach(mode => {
            playerData[player][mode] = {
                elo: INITIAL_ELO,
                wins: 0,
                losses: 0,
                history: []
            };
        });
    });
}

// Data persistence - Firebase
function savePlayerDataToFirebase() {
    if (!firebaseReady) {
        console.warn('Firebase not ready, cannot save player data');
        return;
    }
    const { database, ref, set } = window.firebaseDB;
    set(ref(database, 'playerData'), playerData)
        .then(() => console.log('Player data saved to Firebase'))
        .catch(err => console.error('Error saving player data:', err));
}

function saveMatchHistoryToFirebase() {
    if (!firebaseReady) {
        console.warn('Firebase not ready, cannot save match history');
        return;
    }
    const { database, ref, set } = window.firebaseDB;
    set(ref(database, 'matchHistory'), matchHistory)
        .then(() => console.log('Match history saved to Firebase'))
        .catch(err => console.error('Error saving match history:', err));
}

function saveData() {
    console.log('Saving data to Firebase...');
    savePlayerDataToFirebase();
    saveMatchHistoryToFirebase();
}

// Navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll(`[data-page="${page}"]`).forEach(l => l.classList.add('active'));

            // Show page
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(`page-${page}`).classList.add('active');

            // Close mobile menu
            mobileMenu.classList.remove('open');

            // Update views if needed
            if (page === 'rankings') updateRankingsTable();
            if (page === 'history') updateHistoryList();
            if (page === 'players') updatePlayersGrid();
            if (page === 'home') updateHomeStats();
            if (page === 'pending') updatePendingMatchesUI();
        });
    });

    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
    });
}

// Form initialization
function initializeForm() {
    const gameModeSelect = document.getElementById('game-mode');
    const fields1v1 = document.getElementById('fields-1v1');
    const fields2v2 = document.getElementById('fields-2v2');
    const form = document.getElementById('match-form');

    // Populate all player dropdowns
    const playerSelects = ['winner-1v1', 'loser-1v1', 'winner1-2v2', 'winner2-2v2', 'loser1-2v2', 'loser2-2v2'];
    playerSelects.forEach(id => {
        const select = document.getElementById(id);
        PLAYERS.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            select.appendChild(option);
        });
    });

    // Game mode change handler
    gameModeSelect.addEventListener('change', () => {
        const mode = gameModeSelect.value;
        fields1v1.classList.add('hidden');
        fields2v2.classList.add('hidden');
        document.getElementById('elo-preview').classList.add('hidden');

        if (mode && GAME_MODES[mode].type === '1v1') {
            fields1v1.classList.remove('hidden');
        } else if (mode && GAME_MODES[mode].type === '2v2') {
            fields2v2.classList.remove('hidden');
        }

        validateForm();
    });

    // Add change listeners to all selects for validation and preview
    playerSelects.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            validateForm();
            updateEloPreview();
        });
    });

    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitMatch();
    });

    // Populate filter player dropdown
    const filterPlayer = document.getElementById('filter-player');
    PLAYERS.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        filterPlayer.appendChild(option);
    });
}

function validateForm() {
    const mode = document.getElementById('game-mode').value;
    const submitBtn = document.getElementById('submit-btn');

    if (!mode) {
        submitBtn.disabled = true;
        return false;
    }

    if (GAME_MODES[mode].type === '1v1') {
        const winner = document.getElementById('winner-1v1').value;
        const loser = document.getElementById('loser-1v1').value;

        if (winner && loser && winner !== loser) {
            submitBtn.disabled = false;
            return true;
        }
    } else {
        const winner1 = document.getElementById('winner1-2v2').value;
        const winner2 = document.getElementById('winner2-2v2').value;
        const loser1 = document.getElementById('loser1-2v2').value;
        const loser2 = document.getElementById('loser2-2v2').value;

        const allSelected = winner1 && winner2 && loser1 && loser2;
        const allUnique = new Set([winner1, winner2, loser1, loser2]).size === 4;

        if (allSelected && allUnique) {
            submitBtn.disabled = false;
            return true;
        }
    }

    submitBtn.disabled = true;
    return false;
}

function updateEloPreview() {
    const mode = document.getElementById('game-mode').value;
    const previewDiv = document.getElementById('elo-preview');
    const contentDiv = document.getElementById('elo-preview-content');

    if (!validateForm()) {
        previewDiv.classList.add('hidden');
        return;
    }

    previewDiv.classList.remove('hidden');
    contentDiv.innerHTML = '';

    if (GAME_MODES[mode].type === '1v1') {
        const winner = document.getElementById('winner-1v1').value;
        const loser = document.getElementById('loser-1v1').value;

        const winnerElo = playerData[winner][mode].elo;
        const loserElo = playerData[loser][mode].elo;
        const { winnerChange, loserChange } = calculateEloChange(winnerElo, loserElo);

        contentDiv.innerHTML = `
            <div class="elo-preview-item">
                <span class="name">${winner} (${winnerElo})</span>
                <span class="change positive">+${winnerChange}</span>
            </div>
            <div class="elo-preview-item">
                <span class="name">${loser} (${loserElo})</span>
                <span class="change negative">${loserChange}</span>
            </div>
        `;
    } else {
        const winner1 = document.getElementById('winner1-2v2').value;
        const winner2 = document.getElementById('winner2-2v2').value;
        const loser1 = document.getElementById('loser1-2v2').value;
        const loser2 = document.getElementById('loser2-2v2').value;

        const teamWinnerElo = (playerData[winner1][mode].elo + playerData[winner2][mode].elo) / 2;
        const teamLoserElo = (playerData[loser1][mode].elo + playerData[loser2][mode].elo) / 2;
        const { winnerChange, loserChange } = calculateEloChange(teamWinnerElo, teamLoserElo);

        contentDiv.innerHTML = `
            <div class="elo-preview-item">
                <span class="name">${winner1} (${playerData[winner1][mode].elo})</span>
                <span class="change positive">+${winnerChange}</span>
            </div>
            <div class="elo-preview-item">
                <span class="name">${winner2} (${playerData[winner2][mode].elo})</span>
                <span class="change positive">+${winnerChange}</span>
            </div>
            <div class="elo-preview-item">
                <span class="name">${loser1} (${playerData[loser1][mode].elo})</span>
                <span class="change negative">${loserChange}</span>
            </div>
            <div class="elo-preview-item">
                <span class="name">${loser2} (${playerData[loser2][mode].elo})</span>
                <span class="change negative">${loserChange}</span>
            </div>
        `;
    }
}

// ELO calculations
function calculateExpectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateEloChange(winnerElo, loserElo) {
    const expectedWinner = calculateExpectedScore(winnerElo, loserElo);
    const expectedLoser = calculateExpectedScore(loserElo, winnerElo);

    const winnerChange = Math.round(K_FACTOR * (1 - expectedWinner));
    const loserChange = Math.round(K_FACTOR * (0 - expectedLoser));

    return { winnerChange, loserChange };
}

// Match submission - now creates a pending match
function submitMatch() {
    const mode = document.getElementById('game-mode').value;
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const matchId = String(Date.now());

    let matchData;

    if (GAME_MODES[mode].type === '1v1') {
        const winner = document.getElementById('winner-1v1').value;
        const loser = document.getElementById('loser-1v1').value;

        // Calculate ELO changes at submission time
        const winnerElo = playerData[winner][mode].elo;
        const loserElo = playerData[loser][mode].elo;
        const { winnerChange, loserChange } = calculateEloChange(winnerElo, loserElo);

        matchData = {
            id: matchId,
            mode,
            type: '1v1',
            timestamp,
            expiresAt,
            status: 'pending',
            winners: [winner],
            losers: [loser],
            eloChanges: { [winner]: winnerChange, [loser]: loserChange }
        };
    } else {
        const winner1 = document.getElementById('winner1-2v2').value;
        const winner2 = document.getElementById('winner2-2v2').value;
        const loser1 = document.getElementById('loser1-2v2').value;
        const loser2 = document.getElementById('loser2-2v2').value;

        // Calculate ELO changes at submission time
        const teamWinnerElo = (playerData[winner1][mode].elo + playerData[winner2][mode].elo) / 2;
        const teamLoserElo = (playerData[loser1][mode].elo + playerData[loser2][mode].elo) / 2;
        const { winnerChange, loserChange } = calculateEloChange(teamWinnerElo, teamLoserElo);

        matchData = {
            id: matchId,
            mode,
            type: '2v2',
            timestamp,
            expiresAt,
            status: 'pending',
            winners: [winner1, winner2],
            losers: [loser1, loser2],
            eloChanges: { [winner1]: winnerChange, [winner2]: winnerChange, [loser1]: loserChange, [loser2]: loserChange }
        };
    }

    console.log('Submitting pending match:', matchData);

    if (!firebaseReady) {
        console.warn('Firebase not ready when submitting match!');
        showToast('Firebase not ready. Please refresh and try again.', 'error');
        return;
    }

    const { database, ref, set } = window.firebaseDB;
    set(ref(database, 'pendingMatches/' + matchId), matchData)
        .then(() => {
            console.log('Pending match saved to Firebase');
            showToast('Match submitted! Waiting for loser to confirm.', 'success');
        })
        .catch(err => {
            console.error('Error saving pending match:', err);
            showToast('Error submitting match. Try again.', 'error');
        });

    // Reset form
    document.getElementById('match-form').reset();
    document.getElementById('fields-1v1').classList.add('hidden');
    document.getElementById('fields-2v2').classList.add('hidden');
    document.getElementById('elo-preview').classList.add('hidden');
    document.getElementById('submit-btn').disabled = true;
}

// Apply ELO changes for a confirmed match (uses pre-calculated ELO from submission time)
function applyMatchElo(match) {
    const mode = match.mode;
    const timestamp = match.timestamp;
    const eloChanges = match.eloChanges;
    let neoBrotherUpdate = null;

    if (match.type === '1v1') {
        const winner = match.winners[0];
        const loser = match.losers[0];
        const winnerChange = eloChanges[winner];
        const loserChange = eloChanges[loser];

        playerData[winner][mode].elo += winnerChange;
        playerData[winner][mode].wins++;
        playerData[winner][mode].history.push({ date: timestamp, change: winnerChange, opponent: loser, result: 'win' });

        playerData[loser][mode].elo += loserChange;
        playerData[loser][mode].losses++;
        playerData[loser][mode].history.push({ date: timestamp, change: loserChange, opponent: winner, result: 'loss' });

        // Track Neo vs Brother (only when a Neo plays a Brother)
        neoBrotherUpdate = checkNeoBrotherMatch([winner], [loser]);
    } else {
        const [winner1, winner2] = match.winners;
        const [loser1, loser2] = match.losers;
        const winnerChange = eloChanges[winner1];
        const loserChange = eloChanges[loser1];

        [winner1, winner2].forEach(player => {
            playerData[player][mode].elo += eloChanges[player];
            playerData[player][mode].wins++;
            playerData[player][mode].history.push({
                date: timestamp, change: eloChanges[player],
                teammate: player === winner1 ? winner2 : winner1,
                opponents: [loser1, loser2], result: 'win'
            });
        });

        [loser1, loser2].forEach(player => {
            playerData[player][mode].elo += eloChanges[player];
            playerData[player][mode].losses++;
            playerData[player][mode].history.push({
                date: timestamp, change: eloChanges[player],
                teammate: player === loser1 ? loser2 : loser1,
                opponents: [winner1, winner2], result: 'loss'
            });
        });

        // Track Neo vs Brother (only when Neos play Brothers)
        neoBrotherUpdate = checkNeoBrotherMatch([winner1, winner2], [loser1, loser2]);
    }

    return { neoBrotherUpdate };
}

// Check if match is Neo vs Brother and return who won
function checkNeoBrotherMatch(winners, losers) {
    const winnersAreNeos = winners.every(p => isNeo(p));
    const winnersAreBrothers = winners.every(p => isBrother(p));
    const losersAreNeos = losers.every(p => isNeo(p));
    const losersAreBrothers = losers.every(p => isBrother(p));

    // Only count if it's pure Neo team vs pure Brother team
    if (winnersAreNeos && losersAreBrothers) {
        return 'neo';
    } else if (winnersAreBrothers && losersAreNeos) {
        return 'brother';
    }
    return null;
}

// Update Neo vs Brother display
function updateNeoBrotherDisplay() {
    const display = document.getElementById('neo-brother-score');
    if (display) {
        display.textContent = `${neoBrotherScore.neo} - ${neoBrotherScore.brother}`;
    }
}

// Confirm a pending match (loser enters PIN)
function confirmMatch(matchId, pin) {
    const match = pendingMatches.find(m => m.id === matchId);
    if (!match) {
        showToast('Match not found or expired.', 'error');
        return;
    }

    // Verify PIN against any loser
    const validLoser = match.losers.find(loser => playerPins[loser] && playerPins[loser] === pin);
    if (!validLoser) {
        showToast('Incorrect PIN. Only a losing player can confirm.', 'error');
        return;
    }

    // Apply ELO (uses pre-calculated values from submission time)
    const { neoBrotherUpdate } = applyMatchElo(match);

    // Update Neo vs Brother score if applicable
    if (neoBrotherUpdate === 'neo') {
        neoBrotherScore.neo++;
    } else if (neoBrotherUpdate === 'brother') {
        neoBrotherScore.brother++;
    }

    // Create confirmed match record
    const confirmedMatch = {
        id: parseInt(match.id),
        mode: match.mode,
        type: match.type,
        timestamp: match.timestamp,
        winners: match.winners,
        losers: match.losers,
        eloChanges: match.eloChanges,
        neoBrotherResult: neoBrotherUpdate
    };

    matchHistory.unshift(confirmedMatch);

    // Save everything and remove from pending
    const { database, ref, set } = window.firebaseDB;
    const savePromises = [
        set(ref(database, 'pendingMatches/' + matchId), null),
        set(ref(database, 'playerData'), playerData),
        set(ref(database, 'matchHistory'), matchHistory)
    ];
    if (neoBrotherUpdate) {
        savePromises.push(set(ref(database, 'neoBrotherScore'), neoBrotherScore));
    }
    Promise.all(savePromises).then(() => {
        showToast('Match confirmed! ELO updated.', 'success');
        updateAllViews();
    }).catch(err => {
        console.error('Error confirming match:', err);
        showToast('Error confirming match.', 'error');
    });
}

// Reject a pending match (loser enters PIN)
function rejectMatch(matchId, pin) {
    const match = pendingMatches.find(m => m.id === matchId);
    if (!match) {
        showToast('Match not found or expired.', 'error');
        return;
    }

    const validLoser = match.losers.find(loser => playerPins[loser] && playerPins[loser] === pin);
    if (!validLoser) {
        showToast('Incorrect PIN. Only a losing player can reject.', 'error');
        return;
    }

    const { database, ref, set } = window.firebaseDB;
    set(ref(database, 'pendingMatches/' + matchId), null)
        .then(() => {
            showToast('Match rejected and removed.', 'success');
        })
        .catch(err => {
            console.error('Error rejecting match:', err);
            showToast('Error rejecting match.', 'error');
        });
}

// PIN setup
function setupPin(playerName, pin) {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        showToast('PIN must be exactly 4 digits.', 'error');
        return;
    }
    const { database, ref, set } = window.firebaseDB;
    set(ref(database, 'playerPins/' + playerName), pin)
        .then(() => {
            showToast('PIN set for ' + playerName.split(' ')[0] + '!', 'success');
            closePinModal();
        })
        .catch(err => {
            console.error('Error saving PIN:', err);
            showToast('Error saving PIN.', 'error');
        });
}

function changePin(playerName, oldPin, newPin) {
    if (playerPins[playerName] !== oldPin) {
        showToast('Current PIN is incorrect.', 'error');
        return;
    }
    setupPin(playerName, newPin);
}

// Pending matches UI
function updatePendingBadge() {
    const badge = document.getElementById('pending-badge');
    const badgeMobile = document.getElementById('pending-badge-mobile');
    const count = pendingMatches.length;
    [badge, badgeMobile].forEach(b => {
        if (b) {
            b.textContent = count;
            b.style.display = count > 0 ? 'inline-flex' : 'none';
        }
    });
}

function updatePendingMatchesUI() {
    const container = document.getElementById('pending-list');
    if (!container) return;

    if (pendingMatches.length === 0) {
        container.innerHTML = '<p class="no-data">No pending matches.</p>';
        return;
    }

    container.innerHTML = pendingMatches.map(match => {
        const modeInfo = GAME_MODES[match.mode];
        const date = new Date(match.timestamp);
        const timeAgo = getTimeAgo(date);
        const expiresIn = Math.max(0, Math.round((new Date(match.expiresAt) - new Date()) / (1000 * 60 * 60)));

        let resultText;
        if (match.type === '1v1') {
            resultText = `<span class="winner">${match.winners[0]}</span> defeated <span class="loser">${match.losers[0]}</span>`;
        } else {
            resultText = `<span class="winner">${match.winners.join(' & ')}</span> defeated <span class="loser">${match.losers.join(' & ')}</span>`;
        }

        const losersNeedPin = match.losers.filter(l => !playerPins[l]);
        const noPinWarning = losersNeedPin.length > 0
            ? `<div class="pending-warning">Missing PIN: ${losersNeedPin.map(l => l.split(' ')[0]).join(', ')} - Set PIN first!</div>`
            : '';

        return `
            <div class="pending-item" data-match-id="${match.id}">
                <div class="pending-main">
                    <div class="history-mode">${modeInfo.icon} ${modeInfo.name}</div>
                    <div class="history-result">${resultText}</div>
                    <div class="pending-meta">${timeAgo} | Expires in ~${expiresIn}h</div>
                    ${noPinWarning}
                </div>
                <div class="pending-actions">
                    <input type="password" maxlength="4" pattern="\\d{4}" placeholder="PIN" class="pin-input" id="pin-${match.id}">
                    <button class="btn btn-confirm" onclick="confirmMatch('${match.id}', document.getElementById('pin-${match.id}').value)">Confirm</button>
                    <button class="btn btn-reject" onclick="rejectMatch('${match.id}', document.getElementById('pin-${match.id}').value)">Reject</button>
                </div>
            </div>
        `;
    }).join('');
}

// PIN modal functions
function openPinModal() {
    document.getElementById('pin-modal').classList.add('open');
    // Populate player dropdown
    const select = document.getElementById('pin-player-select');
    select.innerHTML = '<option value="">Select player...</option>';
    PLAYERS.forEach(player => {
        const hasPin = playerPins[player] ? ' (PIN set)' : '';
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player + hasPin;
        select.appendChild(option);
    });
    // Reset fields
    document.getElementById('pin-current').value = '';
    document.getElementById('pin-new').value = '';
    document.getElementById('pin-current-group').style.display = 'none';
    select.addEventListener('change', () => {
        const hasExisting = playerPins[select.value];
        document.getElementById('pin-current-group').style.display = hasExisting ? 'block' : 'none';
    });
}

function closePinModal() {
    document.getElementById('pin-modal').classList.remove('open');
}

function savePinFromModal() {
    const player = document.getElementById('pin-player-select').value;
    const currentPin = document.getElementById('pin-current').value;
    const newPin = document.getElementById('pin-new').value;

    if (!player) {
        showToast('Select a player.', 'error');
        return;
    }

    if (playerPins[player]) {
        changePin(player, currentPin, newPin);
    } else {
        setupPin(player, newPin);
    }
}

// Rankings
let currentRankingsMode = 'pool-1v1';
let currentSort = { field: 'elo', asc: false };

function initializeRankings() {
    const tabs = document.querySelectorAll('.tabs .tab');
    const headers = document.querySelectorAll('.rankings-table th.sortable');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentRankingsMode = tab.dataset.mode;
            updateRankingsTable();
        });
    });

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            if (currentSort.field === field) {
                currentSort.asc = !currentSort.asc;
            } else {
                currentSort.field = field;
                currentSort.asc = false;
            }

            headers.forEach(h => {
                h.classList.remove('active', 'asc');
            });
            header.classList.add('active');
            if (currentSort.asc) header.classList.add('asc');

            updateRankingsTable();
        });
    });
}

function updateRankingsTable() {
    const tbody = document.getElementById('rankings-body');
    tbody.innerHTML = '';

    // Build rankings data
    let rankings = PLAYERS.map(player => {
        const data = playerData[player][currentRankingsMode];
        const total = data.wins + data.losses;
        const winrate = total > 0 ? (data.wins / total * 100) : 0;

        return {
            name: player,
            elo: data.elo,
            wins: data.wins,
            losses: data.losses,
            winrate
        };
    });

    // Sort
    rankings.sort((a, b) => {
        let comparison = 0;
        if (currentSort.field === 'name') {
            comparison = a.name.localeCompare(b.name);
        } else {
            comparison = b[currentSort.field] - a[currentSort.field];
        }
        return currentSort.asc ? -comparison : comparison;
    });

    // Render
    rankings.forEach((player, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `top-${rank}` : '';
        const winrateClass = player.winrate >= 60 ? 'high' : player.winrate >= 40 ? 'medium' : 'low';
        const total = player.wins + player.losses;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="rank-cell ${rankClass}">${rank}</td>
            <td class="player-cell">${player.name}</td>
            <td class="elo-cell">${player.elo}</td>
            <td>${player.wins}</td>
            <td>${player.losses}</td>
            <td class="winrate-cell ${total > 0 ? winrateClass : ''}">${total > 0 ? player.winrate.toFixed(1) + '%' : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// History
function initializeFilters() {
    const filterPlayer = document.getElementById('filter-player');
    const filterMode = document.getElementById('filter-mode');
    const clearBtn = document.getElementById('clear-filters');

    filterPlayer.addEventListener('change', updateHistoryList);
    filterMode.addEventListener('change', updateHistoryList);

    clearBtn.addEventListener('click', () => {
        filterPlayer.value = '';
        filterMode.value = '';
        updateHistoryList();
    });
}

function updateHistoryList() {
    const container = document.getElementById('history-list');
    const filterPlayer = document.getElementById('filter-player').value;
    const filterMode = document.getElementById('filter-mode').value;

    let filtered = matchHistory;

    if (filterPlayer) {
        filtered = filtered.filter(m =>
            m.winners.includes(filterPlayer) || m.losers.includes(filterPlayer)
        );
    }

    if (filterMode) {
        filtered = filtered.filter(m => m.mode === filterMode);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="no-data">No matches found.</p>';
        return;
    }

    container.innerHTML = filtered.map(match => {
        const modeInfo = GAME_MODES[match.mode];
        const date = new Date(match.timestamp);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let resultText;
        if (match.type === '1v1') {
            resultText = `<span class="winner">${match.winners[0]}</span> defeated <span class="loser">${match.losers[0]}</span>`;
        } else {
            resultText = `<span class="winner">${match.winners.join(' & ')}</span> defeated <span class="loser">${match.losers.join(' & ')}</span>`;
        }

        const eloChanges = Object.entries(match.eloChanges)
            .map(([player, change]) => {
                const sign = change > 0 ? '+' : '';
                const className = change > 0 ? 'positive' : 'negative';
                const shortName = player.split(' ')[0];
                return `<span class="${className}">${shortName}: ${sign}${change}</span>`;
            })
            .join(' | ');

        return `
            <div class="history-item">
                <div class="history-main">
                    <div class="history-mode">${modeInfo.icon} ${modeInfo.name}</div>
                    <div class="history-result">${resultText}</div>
                </div>
                <div class="history-details">
                    <div class="history-date">${dateStr}</div>
                    <div class="history-elo-changes">${eloChanges}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Players
function updatePlayersGrid() {
    const container = document.getElementById('players-grid');

    container.innerHTML = PLAYERS.map(player => {
        const initials = player.split(' ').map(n => n[0]).join('').substring(0, 2);

        // Calculate aggregate stats
        let totalWins = 0;
        let totalLosses = 0;
        let highestElo = INITIAL_ELO;
        let highestMode = '';

        Object.keys(GAME_MODES).forEach(mode => {
            const data = playerData[player][mode];
            totalWins += data.wins;
            totalLosses += data.losses;
            if (data.elo > highestElo) {
                highestElo = data.elo;
                highestMode = mode;
            }
        });

        const totalGames = totalWins + totalLosses;
        const overallWinrate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(1) : '-';

        return `
            <div class="player-card">
                <div class="player-header">
                    <div class="player-avatar">${initials}</div>
                    <div class="player-name">${player}</div>
                </div>
                <div class="player-stats">
                    <div class="player-stat">
                        <div class="player-stat-label">Total Games</div>
                        <div class="player-stat-value">${totalGames}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">Win Rate</div>
                        <div class="player-stat-value">${overallWinrate}${overallWinrate !== '-' ? '%' : ''}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">🎱 Pool 1v1</div>
                        <div class="player-stat-value">${playerData[player]['pool-1v1'].elo}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">⚽ Foos 1v1</div>
                        <div class="player-stat-value">${playerData[player]['foosball-1v1'].elo}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">🎱 Pool 2v2</div>
                        <div class="player-stat-value">${playerData[player]['pool-2v2'].elo}</div>
                    </div>
                    <div class="player-stat">
                        <div class="player-stat-label">⚽ Foos 2v2</div>
                        <div class="player-stat-value">${playerData[player]['foosball-2v2'].elo}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Home page updates
function updateHomeStats() {
    // Total matches
    document.getElementById('total-matches').textContent = matchHistory.length;

    // Active players (those who have played at least one game)
    const activePlayers = new Set();
    matchHistory.forEach(match => {
        match.winners.forEach(p => activePlayers.add(p));
        match.losers.forEach(p => activePlayers.add(p));
    });
    document.getElementById('active-players').textContent = activePlayers.size || PLAYERS.length;

    // Weekly matches
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyMatches = matchHistory.filter(m => new Date(m.timestamp) > oneWeekAgo).length;
    document.getElementById('weekly-matches').textContent = weeklyMatches;

    // Recent matches
    updateRecentMatches();

    // Top players
    updateTopPlayers();
}

function updateRecentMatches() {
    const container = document.getElementById('recent-matches');
    const recent = matchHistory.slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = '<p class="no-data">No matches yet. Be the first to submit one!</p>';
        return;
    }

    container.innerHTML = recent.map(match => {
        const modeInfo = GAME_MODES[match.mode];
        const date = new Date(match.timestamp);
        const timeAgo = getTimeAgo(date);

        let resultText;
        if (match.type === '1v1') {
            resultText = `<span class="winner">${match.winners[0]}</span> beat <span class="loser">${match.losers[0]}</span>`;
        } else {
            resultText = `<span class="winner">${match.winners.map(n => n.split(' ')[0]).join(' & ')}</span> beat <span class="loser">${match.losers.map(n => n.split(' ')[0]).join(' & ')}</span>`;
        }

        const winnerChange = match.eloChanges[match.winners[0]];

        return `
            <div class="match-item">
                <div class="match-info">
                    <div class="match-mode">${modeInfo.icon} ${modeInfo.name}</div>
                    <div class="match-players">${resultText}</div>
                </div>
                <div class="match-meta">
                    <div class="match-elo positive">+${winnerChange}</div>
                    <div>${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateTopPlayers() {
    Object.keys(GAME_MODES).forEach(mode => {
        const containerId = mode.replace('-', '-');
        const container = document.getElementById(`top-${containerId}`);

        if (!container) return;

        const rankings = PLAYERS
            .map(player => ({
                name: player,
                elo: playerData[player][mode].elo,
                games: playerData[player][mode].wins + playerData[player][mode].losses
            }))
            .sort((a, b) => b.elo - a.elo)
            .slice(0, 3);

        if (rankings.every(r => r.games === 0)) {
            container.innerHTML = '<p class="no-data" style="padding: 0.5rem; font-size: 0.875rem;">No games played yet</p>';
            return;
        }

        container.innerHTML = rankings.map((player, i) => `
            <div class="top-player">
                <span class="top-player-rank">${i + 1}.</span>
                <span class="top-player-name">${player.name.split(' ')[0]}</span>
                <span class="top-player-elo">${player.elo}</span>
            </div>
        `).join('');
    });
}

// ELO Calculator
function initializeCalculator() {
    const calcBtn = document.getElementById('calc-btn');
    const ratingA = document.getElementById('calc-rating-a');
    const ratingB = document.getElementById('calc-rating-b');

    const calculate = () => {
        const a = parseInt(ratingA.value) || INITIAL_ELO;
        const b = parseInt(ratingB.value) || INITIAL_ELO;

        const expected = calculateExpectedScore(a, b);
        const { winnerChange, loserChange } = calculateEloChange(a, b);

        document.getElementById('calc-prob').textContent = (expected * 100).toFixed(1) + '%';
        document.getElementById('calc-win').textContent = '+' + winnerChange;
        document.getElementById('calc-lose').textContent = loserChange;
    };

    calcBtn.addEventListener('click', calculate);
    ratingA.addEventListener('input', calculate);
    ratingB.addEventListener('input', calculate);

    calculate();
}

// Utility functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';

    return date.toLocaleDateString();
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function updateAllViews() {
    updateHomeStats();
    updateRankingsTable();
    updateHistoryList();
    updatePlayersGrid();
}
