var HypoTrack = (function () {
    const TITLE = 'HypoTrack';
    const VERSION = '0.2.2';
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

        loadImages().then(() => {
            loadedMapImg = true;
            // updateMapBuffer();
        });

        //loadImg('resources/map_regular.jpg').then(img => {
        //    mapImgs.regular = img;
        //    loadedMapImg = true;
        //});
    };

    async function loadImages() {
        const paths = [
            'resources/map_hi-res_NW.webp',
            'resources/map_hi-res_NE.webp',
            'resources/map_hi-res_SW.webp',
            'resources/map_hi-res_SE.webp'
        ];
        try {
            const promises = paths.map(path => loadImg(path));
            const imgs = await Promise.all(promises);
            [mapImgs.nw, mapImgs.ne, mapImgs.sw, mapImgs.se] = imgs;
        } catch (error) {
            console.error("Error loading images:", error);
            mapImgs = {};
        }
    }

    _p5.draw = function () {
        background(255);
        fill(0);
        noStroke();
        if (loadedMapImg) {
            // image(mapBuffer, 0, 0);
            drawMap();
            let dotSize = 2 * pow(1.25, zoomAmt);
            strokeWeight(dotSize / 9);
            if (useSmallDots)
                dotSize *= 9 / 15;

            const worldWidth = WIDTH * zoomMult();

            // our pool of reusable objects
            let coordsPool = [];
            let poolIndex = 0;

            function getCoords() {
                if (poolIndex >= coordsPool.length) {
                    coordsPool.push({ x: 0, y: 0, inBounds: false });
                }
                return coordsPool[poolIndex++];
            }

            function longLatToScreenCoordsPooled(d, out) {
                let long = d.long;
                let lat = d.lat;
                out.x = ((long - panLocation.long + 360) % 360) / mapViewWidth() * WIDTH;
                out.y = (panLocation.lat - lat) / mapViewHeight() * WIDTH / 2 + HEIGHT - WIDTH / 2;
                out.inBounds = out.x >= 0 && out.x < WIDTH && out.y >= (HEIGHT - WIDTH / 2) && out.y < HEIGHT;
            }

            hoverTrack = undefined;
            hoverDot = undefined;

            // first pass: draw tracks and points
            for (let i = 0; i < tracks.length; i++) {
                if (!hideNonSelectedTracks || selectedTrack === tracks[i]) {
                    for (let j = 0; j < tracks[i].length; j++) {
                        let d = tracks[i][j];

                        let coords = getCoords();
                        longLatToScreenCoordsPooled(d, coords);

                        if (j < tracks[i].length - 1) {
                            let d1 = tracks[i][j + 1];
                            let coords1 = getCoords();
                            longLatToScreenCoordsPooled(d1, coords1);

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
                            if (
                                x >= -dotSize / 2 &&
                                x < WIDTH + dotSize / 2 &&
                                coords.y >= (HEIGHT - WIDTH / 2) - dotSize / 2 &&
                                coords.y < HEIGHT + dotSize / 2
                            ) {
                                if (d.type === 0)
                                    ellipse(x, coords.y, dotSize, dotSize);
                                else if (d.type === 1)
                                    rect(
                                        x - dotSize * 0.35,
                                        coords.y - dotSize * 0.35,
                                        dotSize * 0.7,
                                        dotSize * 0.7
                                    );
                                else if (d.type === 2)
                                    triangle(
                                        x + dotSize / 2.2 * cos(PI / 6),
                                        coords.y + dotSize / 2.2 * sin(PI / 6),
                                        x + dotSize / 2.2 * cos((5 * PI) / 6),
                                        coords.y + dotSize / 2.2 * sin((5 * PI) / 6),
                                        x + dotSize / 2.2 * cos((3 * PI) / 2),
                                        coords.y + dotSize / 2.2 * sin((3 * PI) / 2)
                                    );
                            }
                        }

                        mark(coords.x);
                        mark(coords.x - worldWidth);
                        mark(coords.x + worldWidth);
                    }
                }
            }

            // reset pool for future reuse
            poolIndex = 0;

            // second pass: determine hover state
            for (let i = tracks.length - 1; i >= 0; i--) {
                if (!hideNonSelectedTracks || selectedTrack === tracks[i]) {
                    for (let j = tracks[i].length - 1; j >= 0; j--) {
                        let d = tracks[i][j];
                        let c = getCoords();
                        longLatToScreenCoordsPooled(d, c);
                        if (
                            c.inBounds &&
                            sqrt(sq(c.x - mouseX) + sq(c.y - mouseY)) < pow(1.25, zoomAmt)
                        ) {
                            hoverDot = d;
                            hoverTrack = tracks[i];
                            return;
                        }
                    }
                }
            }
        } else {
            textSize(48);
            textAlign(CENTER, CENTER);
            text('Loading...', WIDTH / 2, HEIGHT / 2);
        }
    };

    function /* updateMapBuffer */drawMap() {
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

        if (west < 0) {
            if (north > 0)
                drawSection(mapImgs.nw, -180, 0, 90, 0, west, min(east, 0), north, max(south, 0));
            if (south < 0)
                drawSection(mapImgs.sw, -180, 0, 0, -90, west, min(east, 0), min(north, 0), south);
        }
        if (east > 0) {
            if (north > 0)
                drawSection(mapImgs.ne, 0, 180, 90, 0, max(west, 0), min(east, 180), north, max(south, 0));
            if (south < 0)
                drawSection(mapImgs.se, 0, 180, 0, -90, max(west, 0), min(east, 180), min(north, 0), south);
        }
        if (east > 180) {
            if (north > 0)
                drawSection(mapImgs.nw, 180, 360, 90, 0, 180, min(east, 360), north, max(south, 0));
            if (south < 0)
                drawSection(mapImgs.sw, 180, 360, 0, -90, 180, min(east, 360), min(north, 0), south);
        }
        if (east > 360) {
            if (north > 0)
                drawSection(mapImgs.ne, 360, 540, 90, 0, 360, east, north, max(south, 0));
            if (south < 0)
                drawSection(mapImgs.se, 360, 540, 0, -90, 360, east, min(north, 0), south);
        }
    }

    // Database //

    let Database = (() => {
        let db = new Dexie(IDB_KEY);
        db.version(1).stores({ saves: '' });

        let lastSave = 0;
        const SAVE_DELAY = 2000;

        const withLock = async (operation) => {
            if (!saveLoadReady) return;
            saveLoadReady = false;
            try {
                await operation();
            } catch (error) {
                console.error(`Jinkies. An error occurred: ${error.message}`);
                throw error;
            } finally {
                saveLoadReady = true;
                refreshGUI();
            }
        };

        const getKey = () => saveName || 'Autosave';

        async function save() {
            const now = performance.now();
            if (now - lastSave < SAVE_DELAY) return;
            lastSave = now;

            await withLock(async () => {
                await db.saves.put(tracks, getKey());
            });
        }

        async function load() {
            await withLock(async () => {
                tracks = await db.saves.get(getKey()) || [];
                tracks.forEach(track => {
                    track.forEach((point, i) => {
                        track[i] = Object.assign(Object.create(TrackPoint.prototype), point);
                    });
                });
            });
        }

        async function list() {
            return await db.saves.toCollection().primaryKeys();
        }

        async function delete_() {
            await withLock(async () => {
                await db.saves.delete(getKey());
            });
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

        function undo() {
            if (canUndo()) {
                const action = undoItems.pop();
                const t = action.actionType;
                const d = action.data;

                if (t === ActionTypes.addPoint) {
                    const track = tracks[d.trackIndex];
                    const point = track[d.pointIndex];
                    track.splice(d.pointIndex, 1);
                    if (point === selectedDot && track.length > 0)
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

        function redo() {
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
                    if (point === selectedDot && track.length > 0)
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

        function record(actionType, data) {
            undoItems.push({ actionType, data });
            redoItems = [];
        }

        function reset() {
            undoItems = [];
            redoItems = [];
        }

        function canUndo() {
            return undoItems.length > 0;
        }

        function canRedo() {
            return redoItems.length > 0;
        }

        return { undo, redo, record, reset, ActionTypes, canUndo, canRedo };
    })();

    // Mouse UI //

    _p5.mouseWheel = function (evt) {
        if (!isValidMousePosition() || !loadedMapImg) return;

        const zoomSensitivity = 1 / 125;
        const viewerW = WIDTH;
        const viewerH = WIDTH / 2;
        const mouseRelativeY = mouseY - (HEIGHT - viewerH);

        // calc for zooming
        const oldViewW = mapViewWidth();
        const oldViewH = mapViewHeight();

        zoomAmt = constrain(zoomAmt - evt.delta * zoomSensitivity, 0, 15);

        const newViewW = mapViewWidth();
        const newViewH = mapViewHeight();

        // adjust pan for zoom - will keep the mouse position constant
        const viewChange = {
            w: oldViewW - newViewW,
            h: oldViewH - newViewH
        };

        panLocation.long += viewChange.w * mouseX / viewerW;
        panLocation.lat -= viewChange.h * mouseRelativeY / viewerH;

        // snap to bounds
        panLocation.long = normalizeLongitude(panLocation.long);
        panLocation.lat = constrainLatitude(panLocation.lat, newViewH);

        return false;
    };

    _p5.mousePressed = function () {
        if (mouseButton !== LEFT || !isValidMousePosition() || !loadedMapImg) return;

        beginClickX = mouseX;
        beginClickY = mouseY;

        if (!saveLoadReady) {
            mouseMode = 0;
            return;
        }
        if (deleteTrackPoints) {
            mouseMode = 3;
            return;
        }
        if (hoverTrack === selectedTrack && hoverDot && hoverDot === selectedDot) {
            mouseMode = 2;
            beginPointMoveLong = selectedDot.long;
            beginPointMoveLat = selectedDot.lat;
            return;
        }

        mouseMode = 0;
    };

    _p5.mouseReleased = function () {
        if (mouseButton !== LEFT || !beginClickX || !beginClickY) return;

        const handleAddPoint = () => {
            if (!hoverTrack && !saveLoadReady) return;

            if (hoverTrack) {
                selectedTrack = hoverTrack;
                selectedDot = hoverDot;
                return;
            }

            let insertIndex = 0;
            if (!selectedTrack) {
                selectedTrack = [];
                tracks.push(selectedTrack);
            } else {
                insertIndex = selectedTrack.indexOf(selectedDot) + 1;
            }

            try {
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

                if (autosave) Database.save();
            } catch (err) {
                console.error('Error adding track point:', err);
            }
        };

        const handleMovePoint = () => {
            try {
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

                if (autosave) Database.save();
            } catch (err) {
                console.error('Error moving track point:', err);
            }
            beginPointMoveLong = beginPointMoveLat = undefined;
        };

        const handleDeletePoint = () => {
            for (let i = tracks.length - 1; i >= 0; i--) {
                const track = tracks[i];
                for (let j = track.length - 1; j >= 0; j--) {
                    const point = track[j];
                    const coords = longLatToScreenCoords(point);

                    if (!coords.inBounds ||
                        sqrt(sq(coords.x - mouseX) + sq(coords.y - mouseY)) >= pow(1.25, zoomAmt)) {
                        continue;
                    }

                    try {
                        const trackDeleted = handlePointDeletion(i, j, point);
                        if (autosave) {
                            tracks.length === 0 ? Database.delete() : Database.save();
                        }
                        return;
                    } catch (err) {
                        console.error('Error deleting track point:', err);
                        return;
                    }
                }
            }
        };

        const handlePointDeletion = (trackIndex, pointIndex, point) => {
            let trackDeleted = false;
            const track = tracks[trackIndex];

            track.splice(pointIndex, 1);

            if (point === selectedDot && track.length > 0) {
                selectedDot = track[track.length - 1];
            }

            if (track.length === 0) {
                if (selectedTrack === track) deselectTrack();
                tracks.splice(trackIndex, 1);
                trackDeleted = true;
            } else {
                selectedTrack = track;
            }

            History.record(History.ActionTypes.deletePoint, {
                trackIndex,
                pointIndex,
                long: point.long,
                lat: point.lat,
                cat: point.cat,
                type: point.type,
                trackDeleted
            });

            return trackDeleted;
        };

        const handlers = {
            0: handleAddPoint,
            2: handleMovePoint,
            3: handleDeletePoint
        };

        if (handlers[mouseMode]) {
            handlers[mouseMode]();
        }

        refreshGUI();
        beginClickX = beginClickY = beginPanX = beginPanY = undefined;
    };

    let lastMouseDragged = 0;
    const MOUSE_DRAG_DELAY = 16; // so around ~60 fps

    _p5.mouseDragged = function () {
        if (!isValidMousePosition() || mouseButton !== LEFT || !beginClickX || !beginClickY) return false;

        const now = performance.now();
        if (now - lastMouseDragged < MOUSE_DRAG_DELAY) return false;
        lastMouseDragged = now;

        if (mouseMode === 2 && selectedDot) {
            selectedDot.long = mouseLong();
            selectedDot.lat = mouseLat();
            return false;
        }

        const dragDistance = Math.hypot(mouseX - beginClickX, mouseY - beginClickY);
        if (mouseMode === 1 || dragDistance >= 20) {
            mouseMode = 1;

            if (beginPanX === undefined) beginPanX = panLocation.long;
            if (beginPanY === undefined) beginPanY = panLocation.lat;

            const viewerH = WIDTH / 2;
            const [mvw, mvh] = [mapViewWidth(), mapViewHeight()];
            const [dx, dy] = [mouseX - beginClickX, mouseY - beginClickY];

            panLocation.long = normalizeLongitude(beginPanX - mvw * dx / WIDTH);
            panLocation.lat = constrainLatitude(beginPanY + mvh * dy / viewerH, mvh);
        }

        return false;
    };

    function isValidMousePosition() {
        return mouseX > 0 &&
            mouseX < WIDTH &&
            mouseY > (HEIGHT - WIDTH / 2) &&
            mouseY < HEIGHT;
    }

    function normalizeLongitude(long) {
        if (long < -180) return 180 - (180 - long) % 360;
        if (long >= 180) return (long + 180) % 360 - 180;
        return long;
    }

    function constrainLatitude(lat, viewHeight) {
        return Math.min(90, Math.max(-90 + viewHeight, lat));
    }

    // these seem to be used frequently
    const ZOOM_BASE = 1.25;
    const VIEW_HEIGHT_RATIO = 0.5; // WIDTH/2

    function zoomMult() {
        return pow(ZOOM_BASE, zoomAmt);
    }

    // this is also used frequently, so memoizing it
    const memoizedZoomMult = (() => {
        let lastZoomAmt = null;
        let lastResult = null;
        return () => {
            if (lastZoomAmt !== zoomAmt) {
                lastZoomAmt = zoomAmt;
                lastResult = pow(ZOOM_BASE, zoomAmt);
            }
            return lastResult;
        };
    })();

    function mapViewWidth() {
        return 360 / memoizedZoomMult();
    }

    function mapViewHeight() {
        return 180 / memoizedZoomMult();
    }

    function mouseLong() {
        return panLocation.long + (mouseX * mapViewWidth()) / WIDTH;
    }

    function mouseLat() {
        const relativeY = mouseY - (HEIGHT - WIDTH * VIEW_HEIGHT_RATIO);
        return panLocation.lat - (relativeY * mapViewHeight()) / (WIDTH * VIEW_HEIGHT_RATIO);
    }

    function longLatToScreenCoords(long, lat) {
        if (long instanceof TrackPoint) ({ long, lat } = long);

        const viewWidth = mapViewWidth();
        const viewHeight = mapViewHeight();
        const topBound = HEIGHT - WIDTH * VIEW_HEIGHT_RATIO;

        const x = ((long - panLocation.long + 360) % 360) * WIDTH / viewWidth;
        const y = (panLocation.lat - lat) * (WIDTH * VIEW_HEIGHT_RATIO) / viewHeight + topBound;

        return {
            x,
            y,
            inBounds: x >= 0 && x < WIDTH && y >= topBound && y < HEIGHT
        };
    }

    function loadImg(path) {
        return new Promise((resolve, reject) => {
            try {
                loadImage(path,
                    img => resolve(img),
                    err => reject(new Error(`Failed to load image: ${path} - ${err}`))
                );
            } catch (error) {
                reject(new Error(`Error loading image: ${path} - ${error.message}`));
            }
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
        const uicontainer = document.querySelector('#ui-container');
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

            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    dropdownOption(key, drop);
                }
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
        if (suppresskeybinds) return;

        const k = key.toLowerCase();

        const keyActions = {
            'd': () => categoryToPlace = 0,
            's': () => categoryToPlace = 1,
            '1': () => categoryToPlace = 2,
            '2': () => categoryToPlace = 3,
            '3': () => categoryToPlace = 4,
            '4': () => categoryToPlace = 5,
            '5': () => categoryToPlace = 6,
            'u': () => categoryToPlace = 7,
            't': () => typeToPlace = 0,
            'b': () => typeToPlace = 1,
            'x': () => typeToPlace = 2,
            ' ': () => deselectTrack(),
            'h': () => selectedTrack && (hideNonSelectedTracks = !hideNonSelectedTracks),
            'q': () => deleteTrackPoints = !deleteTrackPoints,
            'l': () => useAltColors = !useAltColors,
            'p': () => useSmallDots = !useSmallDots,
            'a': () => autosave = !autosave
        };

        const handleHistoryAction = (isRedo) => {
            if (keyIsDown(CONTROL)) {
                isRedo ? History.redo() : History.undo();
            }
        };

        if (k === 'z' && keyIsDown(CONTROL)) {
            handleHistoryAction(keyIsDown(SHIFT));
            refreshGUI();
            return false;
        }

        if (k === 'y' && keyIsDown(CONTROL)) {
            handleHistoryAction(true);
            refreshGUI();
            return false;
        }

        const action = keyActions[k];
        if (action) {
            action();
            refreshGUI();
            return false;
        }

        return true;
    };

    function deselectTrack() {
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
