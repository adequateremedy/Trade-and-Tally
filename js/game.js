/* js/game.js */
document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const introScreen = document.getElementById("intro-screen");
    const gameScreen = document.getElementById("game-screen");
    const gameOverScreen = document.getElementById("game-over-screen");
    const victoryScreen = document.getElementById("victory-screen");
    const startBtn = document.getElementById("start-btn");
    const restartBtn = document.getElementById("restart-btn");
    const roundDisplay = document.getElementById("round-display");
    const scoreDisplay = document.getElementById("score-display");
    const movingBelt = document.getElementById("moving-belt");
    const itemTrack = document.getElementById("item-track");
    const boxesContainer = document.getElementById("boxes-container");
    const failReasonText = document.getElementById("fail-reason-text");

    // Game State
    let currentRound = 1;
    let score = 0;
    let gameActive = false;
    let spawnTimer;
    let beltSpeed = 2; 
    let spawnRate = 2500;
    let activeItems = [];
    let currentTallies = {}; 
    
    // Categories and Items (Filenames must match exactly in assets/images/items/... folders)
    const itemsData = {
        mechanical_parts: ['Bolt.png', 'Nut.png', 'Screw.png', 'Washer.png', 'Rivet.png', 'Hinge.png', 'Spring.png', 'Steam_Valve.png', 'Bracket.png', 'Piston.png'],
        tools: ['Wrench.png', 'Hammer.png', 'Screwdriver.png', 'Pliers.png', 'Calipers.png', 'File.png', 'Hand_Drill.png', 'Mallet.png', 'Chisel.png', 'Hacksaw.png'],
        gears_cogs: ['Cog.png', 'Gear.png', 'Pinion.png', 'Flywheel.png', 'Sprocket.png', 'Ratchet.png', 'Cam.png', 'Mainspring.png', 'Spindle.png', 'Crank.png'],
        raw_materials: ['Wire_Spool.png', 'Pipe.png', 'Plate.png', 'Ore.png', 'Coal_Chunk.png', 'Leather_Scrap.png', 'Glass_Shard.png', 'Wood_Block.png', 'Sheet_Metal.png', 'Rubber_Tubing.png'],
        navigation: ['Lantern.png', 'Matchbox.png', 'Compass.png', 'Spyglass.png', 'Pocket_Watch.png', 'Monocle.png', 'Oil_Flask.png', 'Magnifying_Lens.png', 'Sundial.png', 'Sextant.png'] // JUNK
    };

    // Exactly 100 items total across 10 rounds to reach 2000 points (20 pts per item)
    const itemsPerRound = [5, 6, 7, 8, 9, 10, 11, 12, 15, 17];

    startBtn.addEventListener("click", () => {
        introScreen.classList.remove("active");
        startRound(1);
    });

    restartBtn.addEventListener("click", () => {
        gameOverScreen.classList.remove("active");
        score = 0;
        startRound(1);
    });

    function startRound(round) {
        currentRound = round;
        gameActive = true;
        activeItems = [];
        itemTrack.innerHTML = '';
        boxesContainer.innerHTML = '';
        currentTallies = {};

        roundDisplay.innerText = `Round: ${currentRound} / 10`;
        scoreDisplay.innerText = `Score: ${score} / 2000`;

        gameScreen.classList.add("active");

        setupRoundConfig();
        buildBoxes();
        
        movingBelt.style.animationDuration = `${10 / beltSpeed}s`;
        
        spawnTimer = setInterval(spawnItem, spawnRate);
        requestAnimationFrame(updateGame);
    }

    function setupRoundConfig() {
        if (currentRound <= 2) { beltSpeed = 1.5; spawnRate = 3000; }
        else if (currentRound <= 5) { beltSpeed = 2; spawnRate = 2500; }
        else if (currentRound <= 8) { beltSpeed = 3; spawnRate = 2000; }
        else { beltSpeed = 4; spawnRate = 1500; }

        let categoriesToUse = [];
        let junkChance = 0;
        let totalItemsThisRound = itemsPerRound[currentRound - 1];

        if (currentRound === 1) { categoriesToUse = ['mechanical_parts']; }
        else if (currentRound <= 3) { categoriesToUse = ['mechanical_parts', 'tools']; junkChance = currentRound === 3 ? 0.2 : 0; }
        else if (currentRound <= 8) { categoriesToUse = ['mechanical_parts', 'tools', 'raw_materials']; junkChance = 0.3; }
        else { categoriesToUse = ['mechanical_parts', 'tools', 'raw_materials', 'gears_cogs']; junkChance = 0.4; }

        currentTallies.junkChance = junkChance;

        categoriesToUse.forEach(cat => {
            currentTallies[cat] = { req: {}, totalMet: false };
        });

        // Distribute the exact number of required items across the chosen categories
        for (let i = 0; i < totalItemsThisRound; i++) {
            let cat = categoriesToUse[i % categoriesToUse.length];
            let existingItems = Object.keys(currentTallies[cat].req);
            let itemFile;

            // Limit unique items per category to 3 so it fits visually on the tally board
            if (existingItems.length > 0 && Math.random() > 0.5 && existingItems.length >= 2) {
                itemFile = existingItems[Math.floor(Math.random() * existingItems.length)];
            } else if (existingItems.length < 3) {
                let available = itemsData[cat].filter(item => !existingItems.includes(item));
                itemFile = available[Math.floor(Math.random() * available.length)];
            } else {
                itemFile = existingItems[Math.floor(Math.random() * existingItems.length)];
            }

            if (!currentTallies[cat].req[itemFile]) {
                currentTallies[cat].req[itemFile] = { count: 0, required: 0 };
            }
            currentTallies[cat].req[itemFile].required++;
        }
    }

    function buildBoxes() {
        Object.keys(currentTallies).forEach(cat => {
            if(cat === 'junkChance') return;
            
            let boxWrapper = document.createElement('div');
            boxWrapper.className = 'box-wrapper';

            let tallyBoard = document.createElement('div');
            tallyBoard.className = 'tally-board';
            tallyBoard.innerHTML = `<div>${cat.replace('_', ' ').toUpperCase()}</div>`;
            
            let ul = document.createElement('ul');
            ul.style.listStyle = 'none';
            ul.style.padding = '0';
            
            Object.keys(currentTallies[cat].req).forEach(itemName => {
                let li = document.createElement('li');
                li.className = 'tally-item';
                li.id = `tally-${itemName}`;
                li.innerText = `${itemName.split('.')[0]}: 0 / ${currentTallies[cat].req[itemName].required}`;
                ul.appendChild(li);
            });
            tallyBoard.appendChild(ul);

            let dropBox = document.createElement('div');
            dropBox.className = 'drop-box';
            dropBox.dataset.category = cat;

            boxWrapper.appendChild(tallyBoard);
            boxWrapper.appendChild(dropBox);
            boxesContainer.appendChild(boxWrapper);
        });
    }

    function spawnItem() {
        if (!gameActive) return;

        let isJunk = Math.random() < currentTallies.junkChance;
        let category, itemFile;

        if (isJunk) {
            category = 'navigation';
            itemFile = itemsData[category][Math.floor(Math.random() * itemsData[category].length)];
        } else {
            let activeCats = Object.keys(currentTallies).filter(c => c !== 'junkChance' && !currentTallies[c].totalMet);
            if(activeCats.length === 0) return;
            category = activeCats[Math.floor(Math.random() * activeCats.length)];
            
            // Spawn required items heavily
            let neededItems = Object.keys(currentTallies[category].req).filter(item => 
                currentTallies[category].req[item].count < currentTallies[category].req[item].required
            );
            
            if(neededItems.length > 0) {
                itemFile = neededItems[Math.floor(Math.random() * neededItems.length)];
            } else {
                itemFile = itemsData[category][Math.floor(Math.random() * itemsData[category].length)];
            }
        }

        let itemEl = document.createElement('div');
        itemEl.className = 'game-item';
        itemEl.style.backgroundImage = `url('../assets/images/items/${category}/${itemFile}')`;
        itemEl.dataset.category = category;
        itemEl.dataset.filename = itemFile;
        itemEl.style.left = '-80px';
        
        itemTrack.appendChild(itemEl);
        
        let itemObj = { el: itemEl, x: -80, isDragging: false };
        activeItems.push(itemObj);

        setupDrag(itemObj);
    }

    function updateGame() {
        if (!gameActive) return;

        for (let i = activeItems.length - 1; i >= 0; i--) {
            let item = activeItems[i];
            if (!item.isDragging) {
                item.x += beltSpeed;
                item.el.style.left = item.x + 'px';
                item.el.style.top = '50%'; 

                let trackWidth = itemTrack.offsetWidth;
                if (item.x > trackWidth) {
                    if (item.dataset.category !== 'navigation') {
                        let cat = item.dataset.category;
                        if(currentTallies[cat] && currentTallies[cat].req[item.dataset.filename]) {
                            let data = currentTallies[cat].req[item.dataset.filename];
                            if(data.count < data.required) {
                                gameOver("A required item fell off the belt!");
                                return;
                            }
                        }
                    }
                    item.el.remove();
                    activeItems.splice(i, 1);
                }
            }
        }

        requestAnimationFrame(updateGame);
    }

    function setupDrag(itemObj) {
        let el = itemObj.el;
        let offsetX = 0, offsetY = 0;
        
        const startDrag = (e) => {
            if (!gameActive) return;
            itemObj.isDragging = true;
            el.style.zIndex = 100;
            let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            let rect = el.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
        };

        const moveDrag = (e) => {
            if (!itemObj.isDragging || !gameActive) return;
            e.preventDefault(); 
            let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            el.style.position = 'fixed'; 
            el.style.left = (clientX - offsetX) + 'px';
            el.style.top = (clientY - offsetY) + 'px';
        };

        const endDrag = (e) => {
            if (!itemObj.isDragging || !gameActive) return;
            itemObj.isDragging = false;
            el.style.zIndex = 5;

            let rect = el.getBoundingClientRect();
            let dropX = rect.left + rect.width / 2;
            let dropY = rect.top + rect.height / 2;
            
            el.style.position = 'absolute';

            checkDropZone(itemObj, dropX, dropY);
        };

        el.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('mouseup', endDrag);

        el.addEventListener('touchstart', startDrag, {passive: false});
        document.addEventListener('touchmove', moveDrag, {passive: false});
        document.addEventListener('touchend', endDrag);
    }

    function checkDropZone(itemObj, dropX, dropY) {
        let el = itemObj.el;
        let category = el.dataset.category;
        let filename = el.dataset.filename;

        let beltRect = document.getElementById('conveyor-container').getBoundingClientRect();
        if (dropX >= beltRect.left && dropX <= beltRect.right && dropY >= beltRect.top && dropY <= beltRect.bottom) {
            itemObj.x = dropX - beltRect.left; 
            return;
        }

        let boxes = document.querySelectorAll('.drop-box');
        let droppedInBox = null;

        boxes.forEach(box => {
            let rect = box.getBoundingClientRect();
            if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                droppedInBox = box;
            }
        });

        if (droppedInBox) {
            let boxCat = droppedInBox.dataset.category;
            
            if (category === 'navigation') {
                gameOver("You packed a junk item!");
                return;
            }
            if (category !== boxCat) {
                gameOver("You put an item in the wrong box!");
                return;
            }
            
            let reqData = currentTallies[boxCat].req[filename];
            if (!reqData) {
                gameOver("You packed an item not on the tally list!");
                return;
            }
            if (reqData.count >= reqData.required) {
                gameOver("You overfilled a box past its tally!");
                return;
            }

            // Valid Drop
            reqData.count++;
            score += 20;
            scoreDisplay.innerText = `Score: ${score} / 2000`;

            let tallyLi = document.getElementById(`tally-${filename}`);
            tallyLi.innerText = `${filename.split('.')[0]}: ${reqData.count} / ${reqData.required}`;
            
            if (reqData.count === reqData.required) {
                tallyLi.classList.add('complete');
            }

            el.remove();
            activeItems = activeItems.filter(i => i !== itemObj);
            checkRoundComplete();
        } else {
            gameOver("You dropped an item on the floor!");
        }
    }

    function checkRoundComplete() {
        let allComplete = true;
        Object.keys(currentTallies).forEach(cat => {
            if(cat === 'junkChance') return;
            let catComplete = true;
            Object.values(currentTallies[cat].req).forEach(req => {
                if(req.count < req.required) catComplete = false;
            });
            if(catComplete) currentTallies[cat].totalMet = true;
            if(!catComplete) allComplete = false;
        });

        if (allComplete) {
            gameActive = false;
            clearInterval(spawnTimer);
            
            setTimeout(() => {
                if (currentRound < 10) {
                    startRound(currentRound + 1);
                } else {
                    gameScreen.classList.remove("active");
                    victoryScreen.classList.add("active");
                }
            }, 1000);
        }
    }

    function gameOver(reason) {
        gameActive = false;
        clearInterval(spawnTimer);
        failReasonText.innerText = reason;
        gameScreen.classList.remove("active");
        gameOverScreen.classList.add("active");
    }
});
