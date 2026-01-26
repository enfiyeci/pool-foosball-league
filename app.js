// Player list
const PLAYERS = [
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
].sort();

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

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeNavigation();
    initializeForm();
    initializeRankings();
    initializeFilters();
    initializeCalculator();
    updateAllViews();
});

// Data persistence
function loadData() {
    const savedPlayerData = localStorage.getItem('poolFoosballPlayerData');
    const savedMatchHistory = localStorage.getItem('poolFoosballMatchHistory');

    if (savedPlayerData) {
        playerData = JSON.parse(savedPlayerData);
    } else {
        // Initialize all players with default stats for each mode
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

    if (savedMatchHistory) {
        matchHistory = JSON.parse(savedMatchHistory);
    }
}

function saveData() {
    localStorage.setItem('poolFoosballPlayerData', JSON.stringify(playerData));
    localStorage.setItem('poolFoosballMatchHistory', JSON.stringify(matchHistory));
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

// Match submission
function submitMatch() {
    const mode = document.getElementById('game-mode').value;
    const timestamp = new Date().toISOString();

    let matchData;

    if (GAME_MODES[mode].type === '1v1') {
        const winner = document.getElementById('winner-1v1').value;
        const loser = document.getElementById('loser-1v1').value;

        const winnerElo = playerData[winner][mode].elo;
        const loserElo = playerData[loser][mode].elo;
        const { winnerChange, loserChange } = calculateEloChange(winnerElo, loserElo);

        // Update player data
        playerData[winner][mode].elo += winnerChange;
        playerData[winner][mode].wins++;
        playerData[winner][mode].history.push({ date: timestamp, change: winnerChange, opponent: loser, result: 'win' });

        playerData[loser][mode].elo += loserChange;
        playerData[loser][mode].losses++;
        playerData[loser][mode].history.push({ date: timestamp, change: loserChange, opponent: winner, result: 'loss' });

        matchData = {
            id: Date.now(),
            mode,
            type: '1v1',
            timestamp,
            winners: [winner],
            losers: [loser],
            eloChanges: {
                [winner]: winnerChange,
                [loser]: loserChange
            }
        };
    } else {
        const winner1 = document.getElementById('winner1-2v2').value;
        const winner2 = document.getElementById('winner2-2v2').value;
        const loser1 = document.getElementById('loser1-2v2').value;
        const loser2 = document.getElementById('loser2-2v2').value;

        const teamWinnerElo = (playerData[winner1][mode].elo + playerData[winner2][mode].elo) / 2;
        const teamLoserElo = (playerData[loser1][mode].elo + playerData[loser2][mode].elo) / 2;
        const { winnerChange, loserChange } = calculateEloChange(teamWinnerElo, teamLoserElo);

        // Update winners
        [winner1, winner2].forEach(player => {
            playerData[player][mode].elo += winnerChange;
            playerData[player][mode].wins++;
            playerData[player][mode].history.push({
                date: timestamp,
                change: winnerChange,
                teammate: player === winner1 ? winner2 : winner1,
                opponents: [loser1, loser2],
                result: 'win'
            });
        });

        // Update losers
        [loser1, loser2].forEach(player => {
            playerData[player][mode].elo += loserChange;
            playerData[player][mode].losses++;
            playerData[player][mode].history.push({
                date: timestamp,
                change: loserChange,
                teammate: player === loser1 ? loser2 : loser1,
                opponents: [winner1, winner2],
                result: 'loss'
            });
        });

        matchData = {
            id: Date.now(),
            mode,
            type: '2v2',
            timestamp,
            winners: [winner1, winner2],
            losers: [loser1, loser2],
            eloChanges: {
                [winner1]: winnerChange,
                [winner2]: winnerChange,
                [loser1]: loserChange,
                [loser2]: loserChange
            }
        };
    }

    matchHistory.unshift(matchData);
    saveData();

    // Reset form
    document.getElementById('match-form').reset();
    document.getElementById('fields-1v1').classList.add('hidden');
    document.getElementById('fields-2v2').classList.add('hidden');
    document.getElementById('elo-preview').classList.add('hidden');
    document.getElementById('submit-btn').disabled = true;

    showToast('Match recorded successfully!', 'success');
    updateAllViews();
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
