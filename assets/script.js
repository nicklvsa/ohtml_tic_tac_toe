/*
    NOTE: Since I built this game using a library I wrote, I needed to add
    some extra logic due to some limitations of the library.
*/

let tiles = ["", "", "", "", "", "", "", "", ""];

parseOHTML(document.body, {

    chooseTile(evt) {
        const win = StateManager.getState('combos');
        evt.target.innerHTML = StateManager.getState('currentPlay');
        tiles[parseInt(evt.path[0].className)] = evt.target.innerHTML;
        for (let i = 0; i < win.length; i++) {
            const wonRow = win[i];
            if (tiles[wonRow[0]] != "" && tiles[wonRow[0]] == tiles[wonRow[1]] && tiles[wonRow[1]] == tiles[wonRow[2]]) {
                StateManager.setState('winner', `${StateManager.getState('currentPlay')}'s won the game!`);
                StateManager.getState('disableBoard')();
                // alert(`${StateManager.getState('currentPlay')}'s won the game!`);
            }
        }
        StateManager.setState('currentPlay', (StateManager.getState('currentPlay') == 'X') ? 'O' : 'X');
    },

    restartGame() {
        tiles = ["", "", "", "", "", "", "", "", ""];
        StateManager.setState('winner', '');
        StateManager.setState('currentPlay', 'X');
        const btns = document.querySelectorAll('#tiles > div');
        btns.forEach((element) => {
            element.innerHTML = "";
            element.classList.add('can-hover');
            element.addEventListener('click', eventChooseTile);
        });
    },

    disableBoard() {
        const btns = document.querySelectorAll('#tiles > div');
        btns.forEach((element) => {
            element.classList.remove('can-hover');
            element.removeEventListener('click', eventChooseTile, false);
        });
    },

    combos: [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]  
    ],
    winner: '',
    currentPlay: 'X',
}, false);

//setup the actions
const eventChooseTile = (evt) => {
    StateManager.getState('chooseTile')(evt);
};

const btns = document.querySelectorAll('#tiles > div');
btns.forEach((element, i) => {
    element.classList.add(i);
    element.classList.add('can-hover');
    element.addEventListener('click', eventChooseTile);
});

