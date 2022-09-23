var HypoTrack = (function(){
    const TITLE = 'Hypo TC Track Maker';
    const VERSION = '20220923a';
    const IDB_KEY = 'hypo-track';

    const WIDTH = 1000;
    const HEIGHT = 500;
    const COLORS = ['#5ebaff','#00faf4','#fff795','#ffd821','#ff8f20','#ff6060','#c464d9','#c0c0c0'];
    const COLORS_LEGACY = ['#5ebaff','#00faf4','#ffffcc','#ffe775','#ffc140','#ff8f20','#ff6060','#c0c0c0'];

    let loadedMapImg,
        mapImgs,
        panLocation,
        zoomAmt,
        beginClickX,
        beginClickY,
        beginPanX,
        beginPanY,
        mouseMode,
        tracks,
        categoryToPlace,
        typeToPlace,
        hoverDot,
        hoverTrack,
        selectedDot,
        selectedTrack,
        hideNonSelectedTracks,
        deleteTrackPoints,
        useLegacyColors,
        saveName,
        autosave,
        saveLoadReady;

    let refreshGUI; // hoist function

    // container for functions to be made global for p5.js
    let _p5 = {};

    _p5.setup = function(){
        setVersion(TITLE + ' v',VERSION);
        document.title = TITLE;

        let canvas = createCanvas(WIDTH,HEIGHT);
        canvas.parent('canvas-container');

        zoomAmt = 0;
        panLocation = {
            long: -180,
            lat: 90
        };
        loadedMapImg = false;
        tracks = [];
        categoryToPlace = 0;
        typeToPlace = 0;
        useLegacyColors = true;
        autosave = true;
        saveLoadReady = true;

        mapImgs = {};
        
        Promise.all([
            loadImg('resources/map_NW.jpg'),
            loadImg('resources/map_NE.jpg'),
            loadImg('resources/map_SW.jpg'),
            loadImg('resources/map_SE.jpg')
        ]).then(imgs=>{
            mapImgs.nw = imgs[0];
            mapImgs.ne = imgs[1];
            mapImgs.sw = imgs[2];
            mapImgs.se = imgs[3];
            loadedMapImg = true;
        });
    };

    _p5.draw = function(){
        background(255);
        fill(0);
        noStroke();
        if(loadedMapImg)
        {
            // image(mapImg,0,HEIGHT-WIDTH/2,WIDTH,WIDTH/2,panLocation.x,panLocation.y,mapViewWidth(),mapViewHeight());
            drawMap();
            let dotSize = 2*pow(1.25,zoomAmt);
            strokeWeight(dotSize/9);
            for(let i=0;i<tracks.length;i++){
                if(!hideNonSelectedTracks || selectedTrack === tracks[i]){
                    for(let j=0;j<tracks[i].length;j++){
                        let d = tracks[i][j];
                        let coords = longLatToScreenCoords(d);
                        const worldWidth = WIDTH * zoomMult();
                        if(j<tracks[i].length-1){
                            d1 = tracks[i][j+1];
                            coords1 = longLatToScreenCoords(d1);
                            if(/* coords.inBounds || coords1.inBounds */ true){
                                noFill();
                                if(selectedTrack === tracks[i] && !hideNonSelectedTracks)
                                    stroke('#ffff00');
                                else
                                    stroke('#ffffff');
                                let x0 = coords.x;
                                let x1 = coords1.x;
                                if(x1 - x0 > worldWidth / 2)
                                    x1 -= worldWidth;
                                else if(x1 - x0 < -worldWidth / 2)
                                    x1 += worldWidth;
                                line(x0, coords.y, x1, coords1.y);
                                line(x0 - worldWidth, coords.y, x1 - worldWidth, coords1.y);
                                line(x0 + worldWidth, coords.y, x1 + worldWidth, coords1.y);
                            }
                        }
                        if(useLegacyColors)
                            fill(COLORS_LEGACY[d.cat]);
                        else
                            fill(COLORS[d.cat]);
                        if(hideNonSelectedTracks)
                            noStroke();
                        else if(selectedDot === d)
                            stroke('#ff0000');
                        else if(hoverDot === d)
                            stroke('#ff00ff');
                        else if(selectedTrack === tracks[i])
                            stroke('#ffff00');
                        else if(hoverTrack === tracks[i])
                            stroke('#ffffff');
                        else
                            noStroke();
                        function mark(x){
                            if(x >= -dotSize/2 && x < WIDTH + dotSize/2 && coords.y >= (HEIGHT-WIDTH/2) - dotSize/2 && coords.y < HEIGHT + dotSize/2){
                                if(d.type === 0)
                                    ellipse(x,coords.y,dotSize,dotSize);
                                else if(d.type === 1)
                                    rect(x-dotSize*0.35,coords.y-dotSize*0.35,dotSize*0.7,dotSize*0.7);
                                else if(d.type === 2)
                                    triangle(
                                        x+dotSize/2.2*cos(PI/6),
                                        coords.y+dotSize/2.2*sin(PI/6),
                                        x+dotSize/2.2*cos(5*PI/6),
                                        coords.y+dotSize/2.2*sin(5*PI/6),
                                        x+dotSize/2.2*cos(3*PI/2),
                                        coords.y+dotSize/2.2*sin(3*PI/2)
                                        );
                            }
                        }
                        mark(coords.x);
                        mark(coords.x - worldWidth);
                        mark(coords.x + worldWidth);
                    }
                }
            }
            hoverTrack = undefined;
            hoverDot = undefined;
            for(let i=tracks.length-1;i>=0;i--){
                if(!hideNonSelectedTracks || selectedTrack === tracks[i]){
                    for(let j=tracks[i].length-1;j>=0;j--){
                        let d = tracks[i][j];
                        let c = longLatToScreenCoords(d);
                        if(c.inBounds && sqrt(sq(c.x-mouseX)+sq(c.y-mouseY))<pow(1.25,zoomAmt)){
                            hoverDot = d;
                            hoverTrack = tracks[i];
                            return;
                        }
                    }
                }
            }
            // fill(255);
            // noStroke();
            // rect(0,0,WIDTH,HEIGHT-WIDTH/2);
            // fill(0);
            // textAlign(CENTER,CENTER);
            // textSize(12);
            // text('TEST',WIDTH/2,(HEIGHT-WIDTH/2)/2);
        }
        else{
            textSize(48);
            textAlign(CENTER,CENTER);
            text('Loading...', WIDTH/2,HEIGHT/2);
        }
    };

    function drawMap(){
        const topBound = HEIGHT - WIDTH/2;
        const mvw = mapViewWidth();
        const mvh = mapViewHeight();
        const west = panLocation.long;
        const east = west + mvw;
        const north = panLocation.lat;
        const south = north - mvh;

        let drawSection = (img, mw, me, mn, ms, qw, qe, qn, qs) => {
            let {width, height} = img;
            let sx = map(qw, mw, me, 0, width);
            let sy = map(qn, mn, ms, 0, height);
            let sw = map(qe, qw, me, 0, width - sx);
            let sh = map(qs, qn, ms, 0, height - sy);
            let dx = map(qw, west, west + mvw, 0, WIDTH);
            let dy = map(qn, north, south, topBound, HEIGHT);
            let dw = map(qe, qw, west + mvw, 0, WIDTH - dx);
            let dh = map(qs, qn, south, 0, HEIGHT - dy);
            image(img, dx, dy, dw, dh, sx, sy, sw, sh);
        };

        if(west < 0){
            if(north > 0)
                drawSection(mapImgs.nw, -180, 0, 90, 0, west, min(east, 0), north, max(south, 0));
            if(south < 0)
                drawSection(mapImgs.sw, -180, 0, 0, -90, west, min(east, 0), min(north, 0), south);
        }
        if(east > 0){
            if(north > 0)
                drawSection(mapImgs.ne, 0, 180, 90, 0, max(west, 0), min(east, 180), north, max(south, 0));
            if(south < 0)
                drawSection(mapImgs.se, 0, 180, 0, -90, max(west, 0), min(east, 180), min(north, 0), south);
        }
        if(east > 180){
            if(north > 0)
                drawSection(mapImgs.nw, 180, 360, 90, 0, 180, min(east, 360), north, max(south, 0));
            if(south < 0)
                drawSection(mapImgs.sw, 180, 360, 0, -90, 180, min(east, 360), min(north, 0), south);
        }
        if(east > 360){
            if(north > 0)
                drawSection(mapImgs.ne, 360, 540, 90, 0, 360, east, north, max(south, 0));
            if(south < 0)
                drawSection(mapImgs.se, 360, 540, 0, -90, 360, east, min(north, 0), south);
        }
    }

    // Database //

    let Database = (()=>{
        let db = new Dexie(IDB_KEY);

        db.version(1).stores({
            saves: ''
        });

        async function save(){
            if(saveLoadReady){
                saveLoadReady = false;
                let key = saveName || 'Autosave';
                await db.saves.put(tracks, key);
                saveLoadReady = true;
                refreshGUI();
            }
        }

        async function load(){
            if(saveLoadReady){
                saveLoadReady = false;
                let key = saveName || 'Autosave';
                tracks = await db.saves.get(key);
                for(let track of tracks){
                    for(let i = 0; i < track.length; i++){
                        track[i] = Object.assign(Object.create(TrackPoint.prototype), track[i]);
                    }
                }
                saveLoadReady = true;
                refreshGUI();
            }
        }

        async function list(){
            return await db.saves.toCollection().primaryKeys();
        }

        async function delete_(){
            let key = saveName || 'Autosave';
            await db.saves.delete(key);
        }

        return {save, load, list, delete: delete_};
    })();

    // Mouse UI //

    _p5.mouseWheel = function(evt){
        let delta = evt.delta;
        if(mouseX > 0 && mouseX < WIDTH && mouseY > (HEIGHT-WIDTH/2) && mouseY < HEIGHT && loadedMapImg){
            let ow = mapViewWidth();
            let oh = mapViewHeight();
            zoomAmt -= delta/125;
            zoomAmt = constrain(zoomAmt,0,15);
            let nw = mapViewWidth();
            let nh = mapViewHeight();
            let dw = ow - nw;
            let dh = oh - nh;
            let viewerW = WIDTH;
            let viewerH = WIDTH/2;
            let mx = mouseX;
            let my = mouseY - (HEIGHT - viewerH);
            panLocation.long += dw*mx/viewerW;
            panLocation.lat -= dh*my/viewerH;
            if(panLocation.long < -180)
                panLocation.long = 180 - (180 - panLocation.long) % 360;
            if(panLocation.long >= 180)
                panLocation.long = (panLocation.long + 180) % 360 - 180;
            if(panLocation.lat > 90)
                panLocation.lat = 90;
            if(panLocation.lat - nh < -90)
                panLocation.lat = -90 + nh;
        }
    };

    _p5.mousePressed = function(){
        if(mouseButton === LEFT && mouseX > 0 && mouseX < WIDTH && mouseY > (HEIGHT-WIDTH/2) && mouseY < HEIGHT && loadedMapImg){
            beginClickX = mouseX;
            beginClickY = mouseY;
            if(!saveLoadReady)
                mouseMode = 0;
            else if(deleteTrackPoints)
                mouseMode = 3;
            else if(hoverTrack === selectedTrack && hoverDot && hoverDot === selectedDot)
                mouseMode = 2;
            else
                mouseMode = 0;
        }
    };

    _p5.mouseReleased = function(){
        if(mouseButton === LEFT && beginClickX && beginClickY){
            if(mouseMode === 0){
                // if(keyIsDown(CONTROL))
                //     selectedTrack = undefined;
                if(hoverTrack){
                    selectedTrack = hoverTrack;
                    selectedDot = hoverDot;
                }else if(saveLoadReady){
                    let insertIndex = 0;
                    if(!selectedTrack){
                        selectedTrack = [];
                        tracks.push(selectedTrack);
                    }else{
                        for(let i = 0; i < selectedTrack.length; i++){
                            if(selectedTrack[i] === selectedDot)
                                insertIndex = i + 1;
                        }
                    }
                    selectedDot = new TrackPoint(mouseLong(),mouseLat(),categoryToPlace,typeToPlace);
                    selectedTrack.splice(insertIndex, 0, selectedDot);
                    if(autosave)
                        Database.save();
                }
            }else if(mouseMode === 2){
                selectedDot.long = mouseLong();
                selectedDot.lat = mouseLat();
                if(autosave)
                    Database.save();
            }else if(mouseMode === 3){
                for(let i=tracks.length-1, done = false; i>=0 && !done; i--){
                    for(let j=tracks[i].length-1;j>=0 && !done;j--){
                        let d = tracks[i][j];
                        let c = longLatToScreenCoords(d);
                        if(c.inBounds && sqrt(sq(c.x-mouseX)+sq(c.y-mouseY))<pow(1.25,zoomAmt)){
                            tracks[i].splice(j,1);
                            if(d === selectedDot && tracks[i].length > 0)
                                selectedDot = tracks[i][tracks[i].length - 1];
                            if(tracks[i].length===0){
                                if(selectedTrack === tracks[i])
                                    selectedTrack = undefined;
                                if(selectedDot === d)
                                    selectedDot = undefined;
                                tracks.splice(i,1);
                            }
                            else
                                selectedTrack = tracks[i];
                            done = true;
                            if(autosave){
                                if(tracks.length === 0)
                                    Database.delete();
                                else
                                    Database.save();
                            }
                        }
                    }
                }
            }
            refreshGUI();
            beginClickX = undefined;
            beginClickY = undefined;
            beginPanX = undefined;
            beginPanY = undefined;
        }
    };

    _p5.mouseDragged = function(){
        if(mouseButton === LEFT && beginClickX && beginClickY){
            if(mouseMode === 2 && selectedDot){
                selectedDot.long = mouseLong();
                selectedDot.lat = mouseLat();
            }else if(mouseMode === 1 || Math.hypot(mouseX - beginClickX, mouseY - beginClickY) >= 20){
                mouseMode = 1;
                let mvw = mapViewWidth();
                let mvh = mapViewHeight();
                let viewerW = WIDTH;
                let viewerH = WIDTH/2;
                if(beginPanX === undefined)
                    beginPanX = panLocation.long;
                if(beginPanY === undefined)
                    beginPanY = panLocation.lat;
                let dx = mouseX - beginClickX;
                let dy = mouseY - beginClickY;
                panLocation.long = beginPanX - mvw * dx / viewerW;
                panLocation.lat = beginPanY + mvh * dy / viewerH;
                if(panLocation.long < -180)
                    panLocation.long = 180 - (180 - panLocation.long) % 360;
                if(panLocation.long >= 180)
                    panLocation.long = (panLocation.long + 180) % 360 - 180;
                if(panLocation.lat > 90)
                    panLocation.lat = 90;
                if(panLocation.lat - mvh < -90)
                    panLocation.lat = -90 + mvh;
            }
            return false;
        }
    };

    function zoomMult(){
        return pow(1.25, zoomAmt);
    }

    function mapViewWidth(){
        return 360 / zoomMult();
    }

    function mapViewHeight(){
        return 180 / zoomMult();
    }

    function mouseLong(){
        return panLocation.long + mouseX / WIDTH * mapViewWidth();
    }

    function mouseLat(){
        return panLocation.lat - (mouseY - (HEIGHT-WIDTH/2)) / (WIDTH/2) * mapViewHeight();
    }

    function longLatToScreenCoords(long,lat){
        if(long instanceof TrackPoint)
            ({long, lat} = long);
        let x = ((long - panLocation.long + 360) % 360) / mapViewWidth() * WIDTH;
        let y = (panLocation.lat - lat) / mapViewHeight() * WIDTH/2 + HEIGHT-WIDTH/2;
        let inBounds = x >= 0 && x < WIDTH && y >= (HEIGHT-WIDTH/2) && y < HEIGHT;
        return {x, y, inBounds};
    }

    function loadImg(path){     // wrap p5.loadImage in a promise
        return new Promise((resolve,reject)=>{
            setTimeout(()=>{
                loadImage(path,resolve,reject);
            });
        });
    }

    class TrackPoint{
        constructor(long,lat,cat,type){
            this.long = long || 0;
            this.lat = lat || 0;
            this.cat = cat || 0;
            this.type = type || 0;
        }
    }

    // GUI //

    let suppresskeybinds = false;

    window.onload = function(){
        let uicontainer = document.querySelector('#ui-container');
        uicontainer.style.left = (WIDTH + 20) + 'px';

        function div(appendTo){
            let d = document.createElement('div');
            appendTo.appendChild(d);
            return d;
        }

        function dropdownOption(value, appendTo){
            let o = document.createElement('option');
            o.value = value;
            o.innerText = value;
            appendTo.appendChild(o);
            return o;
        }

        function dropdown(id, label, data, appendTo){
            let drop = document.createElement('select');
            drop.id = id;
            let l = document.createElement('label');
            l.htmlFor = drop.id;
            l.innerText = label;
            appendTo.appendChild(l);
            appendTo.appendChild(drop);
            appendTo.appendChild(document.createElement('br'));
    
            for(let key in data){
                dropdownOption(key, drop);
            }

            return drop;
        }

        function button(label, appendTo){
            let b = document.createElement('button');
            b.innerText = label;
            appendTo.appendChild(b);
            appendTo.appendChild(document.createElement('br'));
            return b;
        }

        function checkbox(id, label, appendTo){
            let b = document.createElement('input');
            b.type = 'checkbox';
            b.id = id;
            let l = document.createElement('label');
            l.htmlFor = b.id;
            l.innerText = label;
            appendTo.appendChild(l);
            appendTo.appendChild(b);
            appendTo.appendChild(document.createElement('br'));
            return b;
        }

        function textbox(id, label, appendTo){
            let t = document.createElement('input');
            t.type = 'text';
            t.addEventListener('focus', ()=>suppresskeybinds=true);
            t.addEventListener('blur', ()=>suppresskeybinds=false);
            t.id = id;
            let l = document.createElement('label');
            l.htmlFor = t.id;
            l.innerText = label;
            appendTo.appendChild(l);
            appendTo.appendChild(t);
            appendTo.appendChild(document.createElement('br'));
            return t;
        }

        // Dropdowns div //
        let dropdowns = div(uicontainer);
        
        let categorySelectData = {
            'Depression': 0,
            'Storm': 1,
            'Category 1': 2,
            'Category 2': 3,
            'Category 3': 4,
            'Category 4': 5,
            'Category 5': 6,
            'Unknown': 7
        };

        let typeSelectData = {
            'Tropical': 0,
            'Subtropical': 1,
            'Non-Tropical': 2
        };

        let categorySelect = dropdown('category-select', 'Select Category:', categorySelectData, dropdowns);
        categorySelect.onchange = function(){
            categoryToPlace = categorySelectData[categorySelect.value];
        };

        let typeSelect = dropdown('type-select', 'Select Type:', typeSelectData, dropdowns);
        typeSelect.onchange = function(){
            typeToPlace = typeSelectData[typeSelect.value];
        };

        // Buttons div //
        let buttons = div(uicontainer);

        let deselectButton = button('Deselect Track', buttons);
        deselectButton.onclick = function(){
            selectedTrack = undefined;
            selectedDot = undefined;
            if(hideNonSelectedTracks)
                hideNonSelectedTracks = false;
            refreshGUI();
        };

        let modifyTrackPointButton = button('Modify Track Point', buttons);
        modifyTrackPointButton.onclick = function(){
            if(selectedDot){
                selectedDot.cat = categorySelectData[categorySelect.value];
                selectedDot.type = typeSelectData[typeSelect.value];
                if(autosave)
                    Database.save();
            }
        };

        let singleTrackCheckbox = checkbox('single-track-checkbox', 'Single Track Mode', buttons);
        singleTrackCheckbox.onclick = function(){
            if(selectedTrack)
                hideNonSelectedTracks = singleTrackCheckbox.checked;
        };

        let deletePointsCheckbox = checkbox('delete-points-checkbox', 'Delete Track Points', buttons);
        deletePointsCheckbox.onclick = function(){
            deleteTrackPoints = deletePointsCheckbox.checked;
        }

        let legacyColorCheckbox = checkbox('legacy-color-checkbox', 'Use Legacy Colors', buttons);
        legacyColorCheckbox.onclick = function(){
            useLegacyColors = legacyColorCheckbox.checked;
        };

        let autosaveCheckbox = checkbox('autosave-checkbox', 'Autosave', buttons);
        autosaveCheckbox.onclick = function(){
            autosave = autosaveCheckbox.checked;
        };

        // Save/Load UI //

        let newSeasonButton = button('New Season', div(uicontainer));
        newSeasonButton.onclick = function(){
            tracks = [];
            saveName = undefined;
            refreshGUI();
        };

        let saveloadui = div(uicontainer);

        let saveButton = button('Save', saveloadui);
        let saveNameTextbox = textbox('save-name-textbox', 'Season Save Name:', saveloadui);
        let loadDropdown = dropdown('load-season-dropdown', 'Load Season', {}, saveloadui);

        async function refreshLoadDropdown(){
            let saveList = await Database.list();
            loadDropdown.replaceChildren();
            for(let item of saveList)
                dropdownOption(item, loadDropdown);
            loadDropdown.value = '';
        }

        saveNameTextbox.maxLength = 32;
        saveButton.onclick = function(){
            let validityCheck = /^[a-zA-Z0-9 _\-]{4,32}$/g; // must equal a 4-32 character string of lower-case letters, upper-case letters, digits, spaces, underscores, and hyphens
            if(validityCheck.test(saveNameTextbox.value)){
                saveName = saveNameTextbox.value;
                Database.save();
                refreshGUI();
            }else
                alert('Save names must be at least 4 characters long and only contain letters, numbers, spaces, underscores, or hyphens');
        };

        loadDropdown.onchange = function(){
            if(loadDropdown.value){
                saveName = loadDropdown.value;
                Database.load();
                selectedTrack = undefined;
                selectedDot = undefined;
                if(hideNonSelectedTracks)
                    hideNonSelectedTracks = false;
                refreshGUI();
            }
        };

        refreshGUI = function(){
            for(let k in categorySelectData){
                if(categorySelectData[k] === categoryToPlace)
                    categorySelect.value = k;
            }
            for(let k in typeSelectData){
                if(typeSelectData[k] === typeToPlace)
                    typeSelect.value = k;
            }
            singleTrackCheckbox.checked = hideNonSelectedTracks;
            singleTrackCheckbox.disabled = deselectButton.disabled = !selectedTrack;
            deletePointsCheckbox.checked = deleteTrackPoints;
            modifyTrackPointButton.disabled = !selectedDot || !saveLoadReady;
            legacyColorCheckbox.checked = useLegacyColors;
            autosaveCheckbox.checked = autosave;
            saveButton.disabled = loadDropdown.disabled = newSeasonButton.disabled = !saveLoadReady;
            if(saveName)
                saveNameTextbox.value = saveName;
            else
                saveNameTextbox.value = '';
            refreshLoadDropdown();
        };

        refreshGUI();
    };

    _p5.keyTyped = function(){
        if(suppresskeybinds)
            return;

        if(key === 'd')
            categoryToPlace = 0;
        else if(key === 's')
            categoryToPlace = 1;
        else if(key === '1')
            categoryToPlace = 2;
        else if(key === '2')
            categoryToPlace = 3;
        else if(key === '3')
            categoryToPlace = 4;
        else if(key === '4')
            categoryToPlace = 5;
        else if(key === '5')
            categoryToPlace = 6;
        else if(key === 'u')
            categoryToPlace = 7;
        else if(key === 't')
            typeToPlace = 0;
        else if(key === 'b')
            typeToPlace = 1;
        else if(key === 'x')
            typeToPlace = 2;
        else if(key === ' '){
            selectedTrack = undefined;
            selectedDot = undefined;
            if(hideNonSelectedTracks)
                hideNonSelectedTracks = false;
        }else if(key === 'h'){
            if(selectedTrack)
                hideNonSelectedTracks = !hideNonSelectedTracks;
        }else if(key === 'q')
            deleteTrackPoints = !deleteTrackPoints;
        else if(key === 'l')
            useLegacyColors = !useLegacyColors;
        else if(key === 'a')
            autosave = !autosave;
        else return;
        refreshGUI();
        return false;
    };

    Object.assign(window, _p5);

    return {
        tracks: function(){
            return tracks;
        }
    };
})();
