var HypoTrack = (function () {
    const TITLE = 'HypoTrack';
    const VERSION = '0.2.1';
    const IDB_KEY = 'hypo-track';

    const WIDTH = 1000;
    const HEIGHT = 500;
    const COLORS_ALT = ['#6ec1ea', '#4dffff', '#ffffd9', '#ffd98c', '#ff9e59', '#ff738a', '#a188fc', '#c0c0c0'];
    const COLORS = ['#5ebaff', '#00faf4', '#ffffcc', '#ffe775', '#ffc140', '#ff8f20', '#ff6060', '#c0c0c0'];

    let loadedMapImg,
        mapImgs,
        // mapBuffer,
        panLocation,
        zoomAmt,
        beginClickX,
        beginClickY,
        beginPanX,
        beginPanY,
        beginPointMoveLong,
        beginPointMoveLat,
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
        useAltColors,
        useSmallDots,
        saveName,
        autosave,
        saveLoadReady;

    let refreshGUI; // hoist function

    // container for functions to be made global for p5.js
    let _p5 = {};

    _p5.setup = function () {
        setVersion(TITLE + ' v', VERSION);
        document.title = TITLE;

        let canvas = createCanvas(WIDTH, HEIGHT);
        canvas.parent('canvas-container');
        // mapBuffer = createGraphics(WIDTH, HEIGHT);

        zoomAmt = 0;
        panLocation = {
            long: -180,
            lat: 90
        };
        loadedMapImg = false;
        tracks = [];
        categoryToPlace = 0;
        typeToPlace = 0;
        useAltColors = false;
        useSmallDots = false;
        autosave = true;
        saveLoadReady = true;

        mapImgs = {};
        
        // loadImages().then(() => {
        //     loadedMapImg = true;
        // });

        loadImg('resources/map_regular.jpg').then(img=>{
            mapImgs.regular = img;
            loadedMapImg = true;
            // updateMapBuffer();
        });
    };

    // async function loadImages() {
    //     const paths = [
    //         'resources/map_NW.jpg',
    //         'resources/map_NE.jpg',
    //         'resources/map_SW.jpg',
    //         'resources/map_SE.jpg'
    //     ];
    //     try {
    //         const promises = paths.map(path => loadImg(path));
    //         const imgs = await Promise.all(promises);
    //         [mapImgs.nw, mapImgs.ne, mapImgs.sw, mapImgs.se] = imgs;
    //     } catch (error) {
    //         console.error("Error loading images:", error);
    //         mapImgs = {};
    //     }
    // }

    _p5.draw = function () {
        background(255);
        fill(0);
        noStroke();
        if (loadedMapImg) {
            // image(mapBuffer, 0, 0);
            drawMap();
            let dotSize = 2 * pow(1.25, zoomAmt);
            strokeWeight(dotSize / 9);
            if(useSmallDots)
                dotSize *= 9/15;
            for (let i = 0; i < tracks.length; i++) {
                if (!hideNonSelectedTracks || selectedTrack === tracks[i]) {
                    for (let j = 0; j < tracks[i].length; j++) {
                        let d = tracks[i][j];
                        let coords = longLatToScreenCoords(d);
                        const worldWidth = WIDTH * zoomMult();
                        if (j < tracks[i].length - 1) {
                            let d1 = tracks[i][j + 1];
                            let coords1 = longLatToScreenCoords(d1);
                            if (/* coords.inBounds || coords1.inBounds */ true) {
                                noFill();
                                if (selectedTrack === tracks[i] && !hideNonSelectedTracks)
                                    stroke('#ffff00');
                                else
                                    stroke('#ffffff');
                                let x0 = coords.x;
                                let x1 = coords1.x;
                                if (x1 - x0 > worldWidth / 2)
                                    x1 -= worldWidth;
                                else if (x1 - x0 < -worldWidth / 2)
                                    x1 += worldWidth;
                                line(x0, coords.y, x1, coords1.y);
                                line(x0 - worldWidth, coords.y, x1 - worldWidth, coords1.y);
                                line(x0 + worldWidth, coords.y, x1 + worldWidth, coords1.y);
                            }
                        }
                        if (useAltColors)
                            fill(COLORS_ALT[d.cat]);
                        else
                            fill(COLORS[d.cat]);
                        if (hideNonSelectedTracks)
                            noStroke();
                        else if (selectedDot === d)
                            stroke('#ff0000');
                        else if (hoverDot === d)
                            stroke('#ff00ff');
                        else if (selectedTrack === tracks[i])
                            stroke('#ffff00');
                        else if (hoverTrack === tracks[i])
                            stroke('#ffffff');
                        else
                            noStroke();
                        function mark(x) {
                            if (x >= -dotSize / 2 && x < WIDTH + dotSize / 2 && coords.y >= (HEIGHT - WIDTH / 2) - dotSize / 2 && coords.y < HEIGHT + dotSize / 2) {
                                if (d.type === 0)
                                    ellipse(x, coords.y, dotSize, dotSize);
                                else if (d.type === 1)
                                    rect(x - dotSize * 0.35, coords.y - dotSize * 0.35, dotSize * 0.7, dotSize * 0.7);
                                else if (d.type === 2)
                                    triangle(
                                        x + dotSize / 2.2 * cos(PI / 6),
                                        coords.y + dotSize / 2.2 * sin(PI / 6),
                                        x + dotSize / 2.2 * cos(5 * PI / 6),
                                        coords.y + dotSize / 2.2 * sin(5 * PI / 6),
                                        x + dotSize / 2.2 * cos(3 * PI / 2),
                                        coords.y + dotSize / 2.2 * sin(3 * PI / 2)
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
            for (let i = tracks.length - 1; i >= 0; i--) {
                if (!hideNonSelectedTracks || selectedTrack === tracks[i]) {
                    for (let j = tracks[i].length - 1; j >= 0; j--) {
                        let d = tracks[i][j];
                        let c = longLatToScreenCoords(d);
                        if (c.inBounds && sqrt(sq(c.x - mouseX) + sq(c.y - mouseY)) < pow(1.25, zoomAmt)) {
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
        else {
            textSize(48);
            textAlign(CENTER, CENTER);
            text('Loading...', WIDTH / 2, HEIGHT / 2);
        }
    };

    function /* updateMapBuffer */drawMap () {
        // mapBuffer.clear();

        const topBound = HEIGHT - WIDTH / 2;
        const mvw = mapViewWidth();
        const mvh = mapViewHeight();
        const west = panLocation.long;
        const east = west + mvw;
        const north = panLocation.lat;
        const south = north - mvh;

        let drawSection = (img, mw, me, mn, ms, qw, qe, qn, qs) => {
            let { width, height } = img;
            let sx = map(qw, mw, me, 0, width);
            let sy = map(qn, mn, ms, 0, height);
            let sw = map(qe, qw, me, 0, width - sx);
            let sh = map(qs, qn, ms, 0, height - sy);
            let dx = map(qw, west, west + mvw, 0, WIDTH);
            let dy = map(qn, north, south, topBound, HEIGHT);
            let dw = map(qe, qw, west + mvw, 0, WIDTH - dx);
            let dh = map(qs, qn, south, 0, HEIGHT - dy);
            /* mapBuffer. */image(img, dx, dy, dw, dh, sx, sy, sw, sh);
        };

        // if(west < 0){
        //     if(north > 0)
        //         drawSection(mapImgs.nw, -180, 0, 90, 0, west, min(east, 0), north, max(south, 0));
        //     if(south < 0)
        //         drawSection(mapImgs.sw, -180, 0, 0, -90, west, min(east, 0), min(north, 0), south);
        // }
        // if(east > 0){
        //     if(north > 0)
        //         drawSection(mapImgs.ne, 0, 180, 90, 0, max(west, 0), min(east, 180), north, max(south, 0));
        //     if(south < 0)
        //         drawSection(mapImgs.se, 0, 180, 0, -90, max(west, 0), min(east, 180), min(north, 0), south);
        // }
        // if(east > 180){
        //     if(north > 0)
        //         drawSection(mapImgs.nw, 180, 360, 90, 0, 180, min(east, 360), north, max(south, 0));
        //     if(south < 0)
        //         drawSection(mapImgs.sw, 180, 360, 0, -90, 180, min(east, 360), min(north, 0), south);
        // }
        // if(east > 360){
        //     if(north > 0)
        //         drawSection(mapImgs.ne, 360, 540, 90, 0, 360, east, north, max(south, 0));
        //     if(south < 0)
        //         drawSection(mapImgs.se, 360, 540, 0, -90, 360, east, min(north, 0), south);
        // }

        drawSection(mapImgs.regular, -180, 180, 90, -90, west, min(east, 180), north, south);
        if(east > 180)
            drawSection(mapImgs.regular, 180, 540, 90, -90, 180, east, north, south);
    }

    // Database //

    let Database = (() => {
        let db = new Dexie(IDB_KEY);

        db.version(1).stores({
            saves: ''
        });

        let lastSave = 0;
        const SAVE_DELAY = 2000; // so we save every 2 seconds

        async function save() {
            const now = performance.now();
            if (now - lastSave < SAVE_DELAY)
                return;
            lastSave = now;

            if (saveLoadReady) {
                saveLoadReady = false;
                try {
                    let key = saveName || 'Autosave';
                    await db.saves.put(tracks, key);
                } catch (error) {
                    console.error("Error saving to database:", error);
                } finally {
                    saveLoadReady = true;
                    refreshGUI();
                }
            }
        }

        async function load() {
            if (saveLoadReady) {
                saveLoadReady = false;
                try {
                    let key = saveName || 'Autosave';
                    tracks = await db.saves.get(key) || [];
                    for (let track of tracks) {
                        for (let i = 0; i < track.length; i++) {
                            track[i] = Object.assign(Object.create(TrackPoint.prototype), track[i]);
                        }
                    }
                } catch (error) {
                    console.error("Error loading from database:", error);
                } finally {
                    saveLoadReady = true;
                    refreshGUI();
                }
            }
        }

        async function list() {
            return await db.saves.toCollection().primaryKeys();
        }

        async function delete_() {
            let key = saveName || 'Autosave';
            await db.saves.delete(key);
        }

        return { save, load, list, delete: delete_ };
    })();

    // Undo/Redo History //

    const History = (() => {
        let undoItems = [];
        let redoItems = [];

        const ActionTypes = {
            addPoint: 0,
            movePoint: 1,
            modifyPoint: 2,
            deletePoint: 3
        };

        function undo () {
            if (canUndo()) {
                const action = undoItems.pop();
                const t = action.actionType;
                const d = action.data;

                if (t === ActionTypes.addPoint) {
                    const track = tracks[d.trackIndex];
                    const point = track[d.pointIndex];
                    track.splice(d.pointIndex, 1);
                    if(point === selectedDot && track.length > 0)
                        selectedDot = track[track.length - 1];
                    if (track.length < 1) {
                        tracks.splice(d.trackIndex, 1);
                        if (track === selectedTrack)
                            deselectTrack();
                    }
                } else if (t === ActionTypes.movePoint) {
                    const point = tracks[d.trackIndex][d.pointIndex];
                    point.long = d.long0;
                    point.lat = d.lat0;
                } else if (t === ActionTypes.modifyPoint) {
                    const point = tracks[d.trackIndex][d.pointIndex];
                    point.cat = d.oldCat;
                    point.type = d.oldType;
                } else if (t === ActionTypes.deletePoint) {
                    let track;
                    if (d.trackDeleted) {
                        track = [];
                        tracks.splice(d.trackIndex, 0, track);
                    } else
                        track = tracks[d.trackIndex];
                    const point = new TrackPoint(d.long, d.lat, d.cat, d.type);
                    track.splice(d.pointIndex, 0, point);
                }

                redoItems.push(action);

                if (autosave) {
                    if (tracks.length === 0)
                        Database.delete();
                    else
                        Database.save();
                }
            }
        }

        function redo () {
            if (canRedo()) {
                const action = redoItems.pop();
                const t = action.actionType;
                const d = action.data;

                if (t === ActionTypes.addPoint) {
                    let track;
                    if (d.newTrack) {
                        track = [];
                        tracks.push(track);
                    } else
                        track = tracks[d.trackIndex];
                    const point = new TrackPoint(d.long, d.lat, d.cat, d.type);
                    track.splice(d.pointIndex, 0, point);
                } else if (t === ActionTypes.movePoint) {
                    const point = tracks[d.trackIndex][d.pointIndex];
                    point.long = d.long1;
                    point.lat = d.lat1;
                } else if (t === ActionTypes.modifyPoint) {
                    const point = tracks[d.trackIndex][d.pointIndex];
                    point.cat = d.newCat;
                    point.type = d.newType;
                } else if (t === ActionTypes.deletePoint) {
                    const track = tracks[d.trackIndex];
                    const point = track[d.pointIndex];
                    track.splice(d.pointIndex, 1);
                    if(point === selectedDot && track.length > 0)
                        selectedDot = track[track.length - 1];
                    if (track.length < 1) {
                        tracks.splice(d.trackIndex, 1);
                        if (track === selectedTrack)
                            deselectTrack();
                    }
                }

                undoItems.push(action);

                if (autosave) {
                    if (tracks.length === 0)
                        Database.delete();
                    else
                        Database.save();
                }
            }
        }

        function record (actionType, data) {
            undoItems.push({actionType, data});
            redoItems = [];
        }

        function reset () {
            undoItems = [];
            redoItems = [];
        }

        function canUndo () {
            return undoItems.length > 0;
        }

        function canRedo () {
            return redoItems.length > 0;
        }

        return { undo, redo, record, reset, ActionTypes, canUndo, canRedo };
    })();

    // Mouse UI //

    _p5.mouseWheel = function (evt) {
        let delta = evt.delta;
        if (mouseX > 0 && mouseX < WIDTH && mouseY > (HEIGHT - WIDTH / 2) && mouseY < HEIGHT && loadedMapImg) {
            let ow = mapViewWidth();
            let oh = mapViewHeight();
            zoomAmt -= delta / 125;
            zoomAmt = constrain(zoomAmt, 0, 15);
            let nw = mapViewWidth();
            let nh = mapViewHeight();
            let dw = ow - nw;
            let dh = oh - nh;
            let viewerW = WIDTH;
            let viewerH = WIDTH / 2;
            let mx = mouseX;
            let my = mouseY - (HEIGHT - viewerH);
            panLocation.long += dw * mx / viewerW;
            panLocation.lat -= dh * my / viewerH;
            if (panLocation.long < -180)
                panLocation.long = 180 - (180 - panLocation.long) % 360;
            if (panLocation.long >= 180)
                panLocation.long = (panLocation.long + 180) % 360 - 180;
            if (panLocation.lat > 90)
                panLocation.lat = 90;
            if (panLocation.lat - nh < -90)
                panLocation.lat = -90 + nh;

            // updateMapBuffer();
            return false;
        }
    };

    _p5.mousePressed = function () {
        if (mouseButton === LEFT && mouseX > 0 && mouseX < WIDTH && mouseY > (HEIGHT - WIDTH / 2) && mouseY < HEIGHT && loadedMapImg) {
            beginClickX = mouseX;
            beginClickY = mouseY;
            if (!saveLoadReady)
                mouseMode = 0;
            else if (deleteTrackPoints)
                mouseMode = 3;
            else if (hoverTrack === selectedTrack && hoverDot && hoverDot === selectedDot) {
                mouseMode = 2;
                beginPointMoveLong = selectedDot.long;
                beginPointMoveLat = selectedDot.lat;
            } else
                mouseMode = 0;
        }
    };

    _p5.mouseReleased = function () {
        if (mouseButton === LEFT && beginClickX && beginClickY) {
            if (mouseMode === 0) {
                // if(keyIsDown(CONTROL))
                //     selectedTrack = undefined;
                if (hoverTrack) {
                    selectedTrack = hoverTrack;
                    selectedDot = hoverDot;
                } else if (saveLoadReady) {
                    let insertIndex = 0;
                    if (!selectedTrack) {
                        selectedTrack = [];
                        tracks.push(selectedTrack);
                    } else {
                        insertIndex = selectedTrack.indexOf(selectedDot) + 1;
                    }
                    selectedDot = new TrackPoint(mouseLong(), mouseLat(), categoryToPlace, typeToPlace);
                    selectedTrack.splice(insertIndex, 0, selectedDot);
                    History.record(History.ActionTypes.addPoint, {
                        trackIndex: tracks.indexOf(selectedTrack),
                        pointIndex: insertIndex,
                        long: selectedDot.long,
                        lat: selectedDot.lat,
                        cat: selectedDot.cat,
                        type: selectedDot.type,
                        newTrack: selectedTrack.length === 1
                    });
                    if (autosave)
                        Database.save();
                }
            } else if (mouseMode === 2) {
                selectedDot.long = mouseLong();
                selectedDot.lat = mouseLat();
                let trackIndex = tracks.indexOf(selectedTrack);
                History.record(History.ActionTypes.movePoint, {
                    trackIndex,
                    pointIndex: tracks[trackIndex].indexOf(selectedDot),
                    long0: beginPointMoveLong,
                    lat0: beginPointMoveLat,
                    long1: selectedDot.long,
                    lat1: selectedDot.lat
                });
                beginPointMoveLong = beginPointMoveLat = undefined;
                if (autosave)
                    Database.save();
            } else if (mouseMode === 3) {
                for (let i = tracks.length - 1, done = false; i >= 0 && !done; i--) {
                    for (let j = tracks[i].length - 1; j >= 0 && !done; j--) {
                        let d = tracks[i][j];
                        let c = longLatToScreenCoords(d);
                        if (c.inBounds && sqrt(sq(c.x - mouseX) + sq(c.y - mouseY)) < pow(1.25, zoomAmt)) {
                            let trackDeleted = false;
                            tracks[i].splice(j, 1);
                            if (d === selectedDot && tracks[i].length > 0)
                                selectedDot = tracks[i][tracks[i].length - 1];
                            if (tracks[i].length === 0) {
                                if (selectedTrack === tracks[i])
                                    deselectTrack();
                                tracks.splice(i, 1);
                                trackDeleted = true;
                            }
                            else
                                selectedTrack = tracks[i];
                            History.record(History.ActionTypes.deletePoint, {
                                trackIndex: i,
                                pointIndex: j,
                                long: d.long,
                                lat: d.lat,
                                cat: d.cat,
                                type: d.type,
                                trackDeleted
                            });
                            done = true;
                            if (autosave) {
                                if (tracks.length === 0)
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

    let lastMouseDragged = 0;
    const MOUSE_DRAG_DELAY = 16; // so around ~60 fps

    _p5.mouseDragged = function () {
        const now = performance.now();
        if (now - lastMouseDragged < MOUSE_DRAG_DELAY)
            return;
        lastMouseDragged = now;

        if (mouseButton === LEFT && beginClickX && beginClickY) {
            if (mouseMode === 2 && selectedDot) {
                selectedDot.long = mouseLong();
                selectedDot.lat = mouseLat();
            } else if (mouseMode === 1 || Math.hypot(mouseX - beginClickX, mouseY - beginClickY) >= 20) {
                mouseMode = 1;
                let mvw = mapViewWidth();
                let mvh = mapViewHeight();
                let viewerW = WIDTH;
                let viewerH = WIDTH / 2;
                if (beginPanX === undefined)
                    beginPanX = panLocation.long;
                if (beginPanY === undefined)
                    beginPanY = panLocation.lat;
                let dx = mouseX - beginClickX;
                let dy = mouseY - beginClickY;
                panLocation.long = beginPanX - mvw * dx / viewerW;
                panLocation.lat = beginPanY + mvh * dy / viewerH;
                if (panLocation.long < -180)
                    panLocation.long = 180 - (180 - panLocation.long) % 360;
                if (panLocation.long >= 180)
                    panLocation.long = (panLocation.long + 180) % 360 - 180;
                if (panLocation.lat > 90)
                    panLocation.lat = 90;
                if (panLocation.lat - mvh < -90)
                    panLocation.lat = -90 + mvh;

                // updateMapBuffer();
            }
            return false;
        }
    };

    function zoomMult() {
        return pow(1.25, zoomAmt);
    }

    function mapViewWidth() {
        return 360 / zoomMult();
    }

    function mapViewHeight() {
        return 180 / zoomMult();
    }

    function mouseLong() {
        return panLocation.long + mouseX / WIDTH * mapViewWidth();
    }

    function mouseLat() {
        return panLocation.lat - (mouseY - (HEIGHT - WIDTH / 2)) / (WIDTH / 2) * mapViewHeight();
    }

    function longLatToScreenCoords(long, lat) {
        if (long instanceof TrackPoint)
            ({ long, lat } = long);
        let x = ((long - panLocation.long + 360) % 360) / mapViewWidth() * WIDTH;
        let y = (panLocation.lat - lat) / mapViewHeight() * WIDTH / 2 + HEIGHT - WIDTH / 2;
        let inBounds = x >= 0 && x < WIDTH && y >= (HEIGHT - WIDTH / 2) && y < HEIGHT;
        return { x, y, inBounds };
    }

    function loadImg(path) {
        return new Promise((resolve, reject) => {
            loadImage(path, resolve, reject);
        });
    }

    class TrackPoint {
        constructor(long, lat, cat, type) {
            this.long = long || 0;
            this.lat = lat || 0;
            this.cat = cat || 0;
            this.type = type || 0;
        }
    }

    // GUI //

    let suppresskeybinds = false;

    window.onload = function () {
        let uicontainer = document.querySelector('#ui-container');
        // uicontainer.style.left = (WIDTH + 20) + 'px';

        function div(appendTo) {
            let d = document.createElement('div');
            appendTo.appendChild(d);
            return d;
        }

        function dropdownOption(value, appendTo) {
            let o = document.createElement('option');
            o.value = value;
            o.innerText = value;
            appendTo.appendChild(o);
            return o;
        }

        function dropdown(id, label, data, appendTo) {
            let drop = document.createElement('select');
            drop.id = id;
            let l = document.createElement('label');
            l.htmlFor = drop.id;
            l.innerText = label;
            appendTo.appendChild(l);
            appendTo.appendChild(drop);
            appendTo.appendChild(document.createElement('br'));

            for (let key in data) {
                dropdownOption(key, drop);
            }

            return drop;
        }

        function button(label, appendTo) {
            let b = document.createElement('button');
            b.innerText = label;
            appendTo.appendChild(b);
            appendTo.appendChild(document.createElement('br'));
            return b;
        }

        function checkbox(id, label, appendTo) {
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

        function textbox(id, label, appendTo) {
            let t = document.createElement('input');
            t.type = 'text';
            t.addEventListener('focus', () => suppresskeybinds = true);
            t.addEventListener('blur', () => suppresskeybinds = false);
            t.id = id;
            let l = document.createElement('label');
            l.htmlFor = t.id;
            l.innerText = label;
            appendTo.appendChild(l);
            appendTo.appendChild(t);
            appendTo.appendChild(document.createElement('br'));
            return t;
        }

        // Undo/Redo //
        let undoredo = div(uicontainer);

        let undoButton = button('Undo', undoredo);
        undoButton.onclick = function () {
            History.undo();
            refreshGUI();
        };

        let redoButton = button('Redo', undoredo);
        redoButton.onclick = function () {
            History.redo();
            refreshGUI();
        };
        undoredo.id = "undo-redo";
        undoButton.classList.add("btn");
        redoButton.classList.add("btn");

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
        categorySelect.onchange = function () {
            categoryToPlace = categorySelectData[categorySelect.value];
        };

        let typeSelect = dropdown('type-select', 'Select Type:', typeSelectData, dropdowns);
        typeSelect.onchange = function () {
            typeToPlace = typeSelectData[typeSelect.value];
        };

        // Buttons div //
        let buttons = div(uicontainer);

        let deselectButton = button('Deselect Track', buttons);
        deselectButton.onclick = function () {
            deselectTrack();
            refreshGUI();
        };

        let modifyTrackPointButton = button('Modify Track Point', buttons);
        modifyTrackPointButton.onclick = function () {
            if (selectedDot) {
                const oldCat = selectedDot.cat;
                const oldType = selectedDot.type;
                selectedDot.cat = categorySelectData[categorySelect.value];
                selectedDot.type = typeSelectData[typeSelect.value];
                const trackIndex = tracks.indexOf(selectedTrack);
                History.record(History.ActionTypes.modifyPoint, {
                    trackIndex,
                    pointIndex: tracks[trackIndex].indexOf(selectedDot),
                    oldCat,
                    oldType,
                    newCat: selectedDot.cat,
                    newType: selectedDot.type
                });
                if (autosave)
                    Database.save();
            }
        };

        let singleTrackCheckbox = checkbox('single-track-checkbox', 'Single Track Mode', buttons);
        singleTrackCheckbox.onclick = function () {
            if (selectedTrack)
                hideNonSelectedTracks = singleTrackCheckbox.checked;
        };

        let deletePointsCheckbox = checkbox('delete-points-checkbox', 'Delete Track Points', buttons);
        deletePointsCheckbox.onclick = function () {
            deleteTrackPoints = deletePointsCheckbox.checked;
        }

        let altColorCheckbox = checkbox('alt-color-checkbox', 'Use Accessible Colors', buttons);
        altColorCheckbox.onclick = function () {
            useAltColors = altColorCheckbox.checked;
        };

        let smallDotCheckbox = checkbox('small-dot-checkbox', 'Use Small Points (Season Summary)', buttons);
        smallDotCheckbox.onclick = function () {
            useSmallDots = smallDotCheckbox.checked;
        };

        let autosaveCheckbox = checkbox('autosave-checkbox', 'Autosave', buttons);
        autosaveCheckbox.onclick = function () {
            autosave = autosaveCheckbox.checked;
        };

        // Save/Load UI //

        let saveloadui = div(uicontainer);

        let saveButton = button('Save', saveloadui);
        let saveNameTextbox = textbox('save-name-textbox', 'Season Save Name:', saveloadui);
        let loadDropdown = dropdown('load-season-dropdown', 'Load Season', {}, saveloadui);
        let newSeasonButton = button('New Season', saveloadui);

        async function refreshLoadDropdown() {
            let saveList = await Database.list();
            loadDropdown.replaceChildren();
            for (let item of saveList)
                dropdownOption(item, loadDropdown);
            loadDropdown.value = '';
        }

        saveNameTextbox.maxLength = 32;
        saveButton.onclick = function () {
            let validityCheck = /^[a-zA-Z0-9 _\-]{4,32}$/g; // must equal a 4-32 character string of lower-case letters, upper-case letters, digits, spaces, underscores, and hyphens
            if (validityCheck.test(saveNameTextbox.value)) {
                saveName = saveNameTextbox.value;
                Database.save();
                refreshGUI();
            } else
                alert('Save names must be at least 4 characters long and only contain letters, numbers, spaces, underscores, or hyphens');
        };

        loadDropdown.onchange = function () {
            if (loadDropdown.value) {
                saveName = loadDropdown.value;
                Database.load();
                deselectTrack();
                History.reset();
                refreshGUI();
            }
        };

        newSeasonButton.style.marginTop = '1rem';
        newSeasonButton.onclick = function () {
            tracks = [];
            saveName = undefined;
            History.reset();
            refreshGUI();
        };

        refreshGUI = function () {
            undoButton.disabled = !History.canUndo();
            redoButton.disabled = !History.canRedo();
            for (let k in categorySelectData) {
                if (categorySelectData[k] === categoryToPlace)
                    categorySelect.value = k;
            }
            for (let k in typeSelectData) {
                if (typeSelectData[k] === typeToPlace)
                    typeSelect.value = k;
            }
            singleTrackCheckbox.checked = hideNonSelectedTracks;
            singleTrackCheckbox.disabled = deselectButton.disabled = !selectedTrack;
            deletePointsCheckbox.checked = deleteTrackPoints;
            modifyTrackPointButton.disabled = !selectedDot || !saveLoadReady;
            altColorCheckbox.checked = useAltColors;
            smallDotCheckbox.checked = useSmallDots;
            autosaveCheckbox.checked = autosave;
            saveButton.disabled = loadDropdown.disabled = newSeasonButton.disabled = !saveLoadReady;
            if (saveName)
                saveNameTextbox.value = saveName;
            else
                saveNameTextbox.value = '';
            refreshLoadDropdown();
        };

        refreshGUI();
    };

    _p5.keyPressed = function () {
        if (suppresskeybinds)
            return;

        const k = key.toLowerCase();
        const categoryKeys = ['d', 's', '1', '2', '3', '4', '5', 'u'];
        const typeKeys = ['t', 'b', 'x'];

        if(categoryKeys.includes(k))
            categoryToPlace = categoryKeys.indexOf(k);
        else if (typeKeys.includes(k))
            typeToPlace = typeKeys.indexOf(k);
        else if (k === ' ')
            deselectTrack();
        else if (k === 'h' && selectedTrack)
            hideNonSelectedTracks = !hideNonSelectedTracks;
        else if (k === 'q')
            deleteTrackPoints = !deleteTrackPoints;
        else if (k === 'l')
            useAltColors = !useAltColors;
        else if (k === 'p')
            useSmallDots = !useSmallDots;
        else if (k === 'a')
            autosave = !autosave;
        else if (k === 'z' && keyIsDown(CONTROL)) {
            if (keyIsDown(SHIFT))
                History.redo();
            else
                History.undo();
        } else if (k === 'y' && keyIsDown(CONTROL))
            History.redo();
        else return;
        refreshGUI();
        return false;
    };

    function deselectTrack () {
        selectedTrack = undefined;
        selectedDot = undefined;
        if (hideNonSelectedTracks)
            hideNonSelectedTracks = false;
    }

    Object.assign(window, _p5);

    return {
        tracks: function () {
            return tracks;
        }
    };
})();
