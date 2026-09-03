/* js/game.js */
document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const introScreen = document.getElementById("intro-screen");
    const gameScreen = document.getElementById("game-screen");
    const gameOverScreen = document.getElementById("game-over-screen");
    const roundResultsScreen = document.getElementById("round-results-screen");
    const victoryScreen = document.getElementById("victory-screen");
    const beginOverlay = document.getElementById("begin-overlay");
    const pauseScreen = document.getElementById("pause-screen");
    const glossaryGrid = document.getElementById("glossary-grid");
    
    const startBtn = document.getElementById("start-btn");
    const beginBtn = document.getElementById("begin-btn");
    const restartBtn = document.getElementById("restart-btn");
    const nextRoundBtn = document.getElementById("next-round-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const resumeBtn = document.getElementById("resume-btn");
    const returnHubBtn = document.getElementById("return-hub-btn");
    
    const roundDisplay = document.getElementById("round-display");
    const truckDisplay = document.getElementById("truck-display");
    const scoreDisplay = document.getElementById("score-display");
    const resultsStats = document.getElementById("results-stats");
    const failReasonText = document.getElementById("fail-reason-text");
    
    const movingBelt = document.getElementById("moving-belt");
    const itemTrack = document.getElementById("item-track");
    const boxesContainer = document.getElementById("boxes-container");
    
    const bgMusic = document.getElementById("bg-music");

    // Game State
    let currentRound = 1;
    let score = 0;
    let gameActive = false;
    let isPaused = false;
    let beltSpeed = 1.0; 
    let beltPos = 0;
    let distanceSinceLastSpawn = 250; 
    
    let activeItems = [];
    let activeBoxesData = {};
    let boxIdCounter = 0;
    
    let totalBoxesThisRound = 0;
    let boxesShippedThisRound = 0;
    let boxesSpawnedThisRound = 0;
    let activeBoxesCount = 0;

    // Audio Playlist State
    const playlist = ['assets/audio/Packing-Boxes.mp3', 'assets/audio/Daily-Grind.mp3'];
    let currentTrackIndex = 0;

    bgMusic.addEventListener('ended', () => {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        bgMusic.src = playlist[currentTrackIndex];
        if(!isPaused && gameActive) {
            bgMusic.play().catch(e => console.log(e));
        }
    });

    // Categories and Exactly Matched Items
    const itemsData = {
        mechanical_parts: ['Bolt-removebg-preview.png', 'Bracket-removebg-preview.png', 'Hinge-removebg-preview.png', 'Nut-removebg-preview.png', 'Piston-removebg-preview.png', 'Rivet-removebg-preview.png', 'Screw-removebg-preview.png', 'Spring-removebg-preview.png', 'Valve-removebg-preview.png', 'Washer-removebg-preview.png'],
        tools: ['Calipers-removebg-preview.png', 'Chisel-removebg-preview.png', 'Drill-removebg-preview.png', 'File-removebg-preview.png', 'Hackksaw-removebg-preview.png', 'Hammer-removebg-preview.png', 'Mallet-removebg-preview.png', 'Pliers-removebg-preview.png', 'Screwdriver-removebg-preview.png', 'Wrench-removebg-preview.png'],
        gears_cogs: ['Cam.png', 'Cog.png', 'Crank.png', 'FlyWheel.png', 'Gear.png', 'Main-Spring.png', 'Pinion.png', 'Rachet.png', 'Spindel.png', 'Sprocket.png'],
        raw_materials: ['Coal-Chunk.png', 'Glass-Shard.png', 'Leather-Scrap.png', 'Ore.png', 'Pipe.png', 'Plate.png', 'Rubber-Tubing.png', 'Sheet-Metal.png', 'Wire-Spool.png', 'Wood-Block.png'],
        navigation: ['Compass.png', 'Lantern.png', 'Magnifying-Lens.png', 'Matchbox.png', 'Monocle.png', 'Oil-Flask.png', 'Pocket-Watch.png', 'Sextant.png', 'Spyglass.png', 'Sundial.png'] 
    };

    const boxesPerRound = [5, 6, 7, 8, 9, 10, 11, 12, 15, 17];
    
    let activeCategories = [];
    let junkChance = 0;

    function getDisplayName(filename) {
        return filename.replace('-removebg-preview.png', '').replace('.png', '');
    }

    // Auto-generate the Glossary Grid for the Pause Screen
    function generateGlossary() {
        glossaryGrid.innerHTML = '';
        for (let category in itemsData) {
            itemsData[category].forEach(filename => {
                let itemDiv = document.createElement("div");
                itemDiv.className = "glossary-item";
                
                let nameLabel = document.createElement("div");
                nameLabel.className = "glossary-name";
                nameLabel.innerText = getDisplayName(filename);
                
                let img = document.createElement("img");
                img.src = `assets/images/items/${category}/${filename}`;
                img.alt = getDisplayName(filename);
                
                itemDiv.appendChild(nameLabel);
                itemDiv.appendChild(img);
                glossaryGrid.appendChild(itemDiv);
            });
        }
    }
    
    generateGlossary();

    // Button Listeners
    startBtn.addEventListener("click", () => {
        introScreen.classList.remove("active");
        setupRound(1);
    });

    beginBtn.addEventListener("click", () => {
        beginOverlay.style.display = 'none';
        isPaused = false;
        bgMusic.play().catch(e => console.log(e));
        startGameplay();
    });

    restartBtn.addEventListener("click", () => {
        gameOverScreen.classList.remove("active");
        score = 0;
        currentTrackIndex = 0;
        bgMusic.src = playlist[0];
        setupRound(1);
    });

    nextRoundBtn.addEventListener("click", () => {
        roundResultsScreen.classList.remove("active");
        setupRound(currentRound + 1);
    });

    returnHubBtn.addEventListener("click", () => {
        window.location.href = "https://adequateremedy.github.io/RPG-Hub/?class2Complete=true";
    });

    // Pause functionality
    pauseBtn.addEventListener("click", togglePause);
    resumeBtn.addEventListener("click", togglePause);

    function togglePause() {
        if (!gameActive) return; 
        
        isPaused = !isPaused;
        
        if (isPaused) {
            bgMusic.pause();
            pauseScreen.classList.add("active");
        } else {
            pauseScreen.classList.remove("active");
            bgMusic.play().catch(e => console.log(e));
        }
    }

    function setupRound(round) {
        currentRound = round;
        activeItems = [];
        activeBoxesData = {};
        boxIdCounter = 0;
        distanceSinceLastSpawn = 250; 
        isPaused = false;
        
        totalBoxesThisRound = boxesPerRound[currentRound - 1];
        boxesShippedThisRound = 0;
        boxesSpawnedThisRound = 0;
        activeBoxesCount = 0;

        itemTrack.innerHTML = '';
        boxesContainer.innerHTML = '';
        beginOverlay.style.display = 'flex'; 
        pauseScreen.classList.remove("active");

        roundDisplay.innerText = `Round: ${currentRound} / 10`;
        truckDisplay.innerText = `On the Truck: 0 / ${totalBoxesThisRound}`;
        scoreDisplay.innerText = `Score: ${score} / 2000`;

        gameScreen.classList.add("active");

        setupRoundConfig();
        maintainBoxes();
        
        movingBelt.style.animation = 'none';
    }

    function startGameplay() {
        gameActive = true;
        distanceSinceLastSpawn = 250; 
        requestAnimationFrame(updateGame);
    }

    function setupRoundConfig() {
        const speeds = [1.0, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.2, 3.5];
        beltSpeed = speeds[currentRound - 1] || 3.5;

        if (currentRound === 1) { activeCategories = ['mechanical_parts']; junkChance = 0; }
        else if (currentRound <= 3) { activeCategories = ['mechanical_parts', 'tools']; junkChance = currentRound === 3 ? 0.2 : 0; }
        else if (currentRound <= 8) { activeCategories = ['mechanical_parts', 'tools', 'raw_materials']; junkChance = 0.3; }
        else { activeCategories = ['mechanical_parts', 'tools', 'raw_materials', 'gears_cogs']; junkChance = 0.4; }
    }

    function maintainBoxes() {
        while (activeBoxesCount < 3 && boxesSpawnedThisRound < totalBoxesThisRound) {
            spawnBox();
            activeBoxesCount++;
            boxesSpawnedThisRound++;
        }
    }

    function spawnBox() {
        let boxId = `box-${boxIdCounter++}`;
        let category = activeCategories[Math.floor(Math.random() * activeCategories.length)];
        
        let boxData = { category: category, req: {}, elementId: boxId };
        let numTypes = 2; 
        
        let itemsOnBelt = activeItems.map(itemObj => itemObj.el.dataset.filename);
        let availableItems = itemsData[category].filter(filename => !itemsOnBelt.includes(filename));
        
        if (availableItems.length < numTypes) {
            availableItems = [...itemsData[category]];
        }

        for(let i=0; i<numTypes; i++) {
            let randIndex = Math.floor(Math.random() * availableItems.length);
            let itemFile = availableItems.splice(randIndex, 1)[0];
            let reqAmount = Math.floor(Math.random() * 3) + 1;
            boxData.req[itemFile] = { count: 0, required: reqAmount };
        }
        
        activeBoxesData[boxId] = boxData;
        renderBox(boxData);
    }

    function renderBox(boxData) {
        let boxWrapper = document.createElement('div');
        boxWrapper.className = 'box-wrapper';
        boxWrapper.id = `wrapper-${boxData.elementId}`;

        let tallyBoard = document.createElement('div');
        tallyBoard.className = 'tally-board';
        
        let ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';
        
        Object.keys(boxData.req).forEach(itemName => {
            let li = document.createElement('li');
            li.className = 'tally-item';
            li.id = `tally-${boxData.elementId}-${itemName}`;
            let displayName = getDisplayName(itemName);
            li.innerText = `${displayName}: 0 / ${boxData.req[itemName].required}`;
            ul.appendChild(li);
        });
        tallyBoard.appendChild(ul);

        let dropBox = document.createElement('div');
        dropBox.className = 'drop-box';
        dropBox.dataset.boxId = boxData.elementId;
        dropBox.dataset.category = boxData.category;

        boxWrapper.appendChild(tallyBoard);
        boxWrapper.appendChild(dropBox);
        boxesContainer.appendChild(boxWrapper);
    }

    function spawnItem() {
        if (!gameActive || isPaused) return;

        let isJunk = Math.random() < junkChance;
        let category, itemFile;

        if (isJunk) {
            category = 'navigation';
            itemFile = itemsData[category][Math.floor(Math.random() * itemsData[category].length)];
        } else {
            let neededPool = [];
            Object.values(activeBoxesData).forEach(box => {
                Object.keys(box.req).forEach(item => {
                    if (box.req[item].count < box.req[item].required) {
                        neededPool.push({ cat: box.category, file: item });
                    }
                });
            });

            if (neededPool.length > 0 && Math.random() < 0.35) {
                let chosen = neededPool[Math.floor(Math.random() * neededPool.length)];
                category = chosen.cat;
                itemFile = chosen.file;
            } else {
                category = activeCategories[Math.floor(Math.random() * activeCategories.length)];
                itemFile = itemsData[category][Math.floor(Math.random() * itemsData[category].length)];
            }
        }

        let itemEl = document.createElement('div');
        itemEl.className = 'game-item';
        itemEl.style.backgroundImage = `url('assets/images/items/${category}/${itemFile}')`;
        itemEl.dataset.category = category;
        itemEl.dataset.filename = itemFile;
        
        let startX = itemTrack.offsetWidth;
        itemEl.style.left = startX + 'px';
        
        itemTrack.appendChild(itemEl);
        
        let itemObj = { el: itemEl, x: startX, isDragging: false };
        activeItems.push(itemObj);

        setupDrag(itemObj);
    }

    function updateGame() {
        if (!gameActive) return;

        if (!isPaused) {
            beltPos -= beltSpeed;
            distanceSinceLastSpawn += beltSpeed;
            movingBelt.style.backgroundPosition = `${beltPos}px 0`;

            for (let i = activeItems.length - 1; i >= 0; i--) {
                let item = activeItems[i];
                if (!item.isDragging) {
                    item.x -= beltSpeed; 
                    item.el.style.left = item.x + 'px';
                    item.el.style.top = '50%'; 

                    if (item.x < -150) { 
                        let isNeeded = false;
                        let filename = item.el.dataset.filename;
                        Object.values(activeBoxesData).forEach(box => {
                            if (box.req[filename] && box.req[filename].count < box.req[filename].required) {
                                isNeeded = true;
                            }
                        });

                        if (isNeeded) {
                            gameOver("You let a needed item fall off the belt!");
                            return; 
                        }

                        item.el.remove();
                        activeItems.splice(i, 1);
                    }
                }
            }

            if (distanceSinceLastSpawn >= 250) {
                spawnItem();
                distanceSinceLastSpawn = 0;
            }
        }

        if (gameActive) {
            requestAnimationFrame(updateGame);
        }
    }

    function setupDrag(itemObj) {
        let el = itemObj.el;
        let offsetX = 0, offsetY = 0;
        
        const startDrag = (e) => {
            if (!gameActive || isPaused) return;
            itemObj.isDragging = true;
            el.style.zIndex = 100;
            let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            let rect = el.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
        };

        const moveDrag = (e) => {
            if (!itemObj.isDragging || !gameActive || isPaused) return;
            e.preventDefault(); 
            let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            el.style.position = 'fixed'; 
            el.style.left = (clientX - offsetX) + 'px';
            el.style.top = (clientY - offsetY) + 'px';
        };

        const endDrag = (e) => {
            if (!itemObj.isDragging || !gameActive || isPaused) return;
            itemObj.isDragging = false;
            el.style.zIndex = 5;

            let clientX, clientY;
            if (e.type.includes('mouse')) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            }
            
            el.style.position = 'absolute';

            checkDropZone(itemObj, clientX, clientY);
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

        let boxes = document.querySelectorAll('.drop-box');
        let droppedInBox = null;

        boxes.forEach(box => {
            let rect = box.getBoundingClientRect();
            if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                droppedInBox = box;
            }
        });

        if (droppedInBox) {
            if (category === 'navigation') {
                gameOver("You packed a junk item!");
                return;
            }

            let targetBoxId = droppedInBox.dataset.boxId;
            let targetBoxData = activeBoxesData[targetBoxId];

            if (category !== targetBoxData.category) {
                gameOver("You put an item in the wrong box!");
                return;
            }
            
            let reqData = targetBoxData.req[filename];
            if (!reqData) {
                gameOver("You packed an item not on the tally list!");
                return;
            }
            if (reqData.count >= reqData.required) {
                gameOver("You overfilled a box past its tally!");
                return;
            }

            reqData.count++;
            let tallyLi = document.getElementById(`tally-${targetBoxId}-${filename}`);
            let displayName = getDisplayName(filename);
            tallyLi.innerText = `${displayName}: ${reqData.count} / ${reqData.required}`;
            
            if (reqData.count === reqData.required) {
                tallyLi.classList.add('complete');
            }

            el.remove();
            activeItems = activeItems.filter(i => i !== itemObj);
            
            checkBoxComplete(targetBoxId);
            return;
        } 
        
        let visibleBelt = document.getElementById('moving-belt');
        let beltRect = visibleBelt.getBoundingClientRect();
        
        if (dropX >= beltRect.left && dropX <= beltRect.right && dropY >= beltRect.top && dropY <= beltRect.bottom) {
            let trackRect = document.getElementById('item-track').getBoundingClientRect();
            itemObj.x = dropX - trackRect.left; 
            return;
        }

        gameOver("You dropped an item on the floor!");
    }

    function checkBoxComplete(boxId) {
        let boxData = activeBoxesData[boxId];
        let allComplete = true;
        
        Object.values(boxData.req).forEach(req => {
            if (req.count < req.required) allComplete = false;
        });

        if (allComplete) {
            score += 20;
            boxesShippedThisRound++;
            activeBoxesCount--;
            
            scoreDisplay.innerText = `Score: ${score} / 2000`;
            truckDisplay.innerText = `On the Truck: ${boxesShippedThisRound} / ${totalBoxesThisRound}`;
            
            document.getElementById(`wrapper-${boxId}`).remove();
            delete activeBoxesData[boxId];

            if (boxesShippedThisRound >= totalBoxesThisRound) {
                endRoundSuccess();
            } else {
                maintainBoxes(); 
            }
        }
    }

    function endRoundSuccess() {
        gameActive = false;
        bgMusic.pause();
        
        setTimeout(() => {
            if (currentRound < 10) {
                resultsStats.innerText = `Boxes Shipped: ${boxesShippedThisRound}\nCurrent Score: ${score} / 2000`;
                gameScreen.classList.remove("active");
                roundResultsScreen.classList.add("active");
            } else {
                gameScreen.classList.remove("active");
                victoryScreen.classList.add("active");
            }
        }, 1000);
    }

    function gameOver(reason) {
        gameActive = false;
        bgMusic.pause();
        failReasonText.innerText = reason;
        gameScreen.classList.remove("active");
        gameOverScreen.classList.add("active");
    }
});
