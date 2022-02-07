var TrackMaker = (function(){
    const TITLE = 'Hypo TC Track Maker';
    const VERSION = '20220207a';

    const WIDTH = 1000;
    const HEIGHT = 500;
    const COLORS = ['#5ebaff','#00faf4','#ffffcc','#ffe775','#ffc140','#ff8f20','#ff6060','#c0c0c0'];

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
        deleteTrackPoints;

    let refreshGUI; // hoist function

    // container for functions to be made global for p5.js
    let _p5 = {};

    _p5.setup = function(){
        setVersion(TITLE + ' v',VERSION);
        document.title = TITLE;

        createCanvas(WIDTH,HEIGHT);

        zoomAmt = 0;
        panLocation = {
            long: -180,
            lat: 90
        };
        loadedMapImg = false;
        tracks = [];
        categoryToPlace = 0;
        typeToPlace = 0;

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
                        if(j<tracks[i].length-1){
                            d1 = tracks[i][j+1];
                            coords1 = longLatToScreenCoords(d1);
                            if(coords.inBounds || coords1.inBounds){
                                noFill();
                                if(selectedTrack === tracks[i] && !hideNonSelectedTracks)
                                    stroke('#ffff00');
                                else
                                    stroke('#ffffff');
                                line(coords.x,coords.y,coords1.x,coords1.y);
                            }
                        }
                        if(coords.inBounds){
                            fill(COLORS[d.cat]);
                            if(hideNonSelectedTracks)
                                noStroke();
                            else if(selectedTrack === tracks[i])
                                stroke('#ffff00');
                            else if(hoverTrack === tracks[i])
                                stroke('#ffffff');
                            else
                                noStroke();
                            if(d.type === 0)
                                ellipse(coords.x,coords.y,dotSize,dotSize);
                            else if(d.type === 1)
                                rect(coords.x-dotSize*0.35,coords.y-dotSize*0.35,dotSize*0.7,dotSize*0.7);
                            else if(d.type === 2)
                                triangle(
                                    coords.x+dotSize/2.2*cos(PI/6),
                                    coords.y+dotSize/2.2*sin(PI/6),
                                    coords.x+dotSize/2.2*cos(5*PI/6),
                                    coords.y+dotSize/2.2*sin(5*PI/6),
                                    coords.x+dotSize/2.2*cos(3*PI/2),
                                    coords.y+dotSize/2.2*sin(3*PI/2)
                                    );
                        }
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
            if(deleteTrackPoints){
                mouseMode = 3;
            }else{
                mouseMode = 0;
                if(hoverTrack === selectedTrack && hoverDot){
                    selectedDot = hoverDot;
                    mouseMode = 2;
                }
                // for(let i=tracks.length-1;i>=0;i--){
                //     for(let j=tracks[i].length-1;j>=0;j--){
                //         let d = tracks[i][j];
                //         let c = longLatToScreenCoords(d);
                //         if(c.inBounds && sqrt(sq(c.x-mouseX)+sq(c.y-mouseY))<pow(1.25,zoomAmt)){
                //             selectedDot = d;
                //             selectedTrack = tracks[i];
                //             mouseMode = 2;
                //             return;
                //         }
                //     }
                // }
            }
        }
    };

    _p5.mouseReleased = function(){
        if(mouseButton === LEFT && beginClickX && beginClickY){
            if(mouseMode === 0){
                // if(keyIsDown(CONTROL))
                //     selectedTrack = undefined;
                if(hoverTrack)
                    selectedTrack = hoverTrack;
                else{
                    if(!selectedTrack){
                        selectedTrack = [];
                        tracks.push(selectedTrack);
                    }
                    selectedTrack.push(new TrackPoint(mouseLong(),mouseLat(),categoryToPlace,typeToPlace));
                }
            }else if(mouseMode === 2){
                selectedDot.long = mouseLong();
                selectedDot.lat = mouseLat();
            }else if(mouseMode === 3){
                for(let i=tracks.length-1, done = false; i>=0 && !done; i--){
                    for(let j=tracks[i].length-1;j>=0 && !done;j--){
                        let d = tracks[i][j];
                        let c = longLatToScreenCoords(d);
                        if(c.inBounds && sqrt(sq(c.x-mouseX)+sq(c.y-mouseY))<pow(1.25,zoomAmt)){
                            tracks[i].splice(j,1);
                            if(tracks[i].length===0){
                                if(selectedTrack === tracks[i])
                                    selectedTrack = undefined;
                                tracks.splice(i,1);
                            }
                            else
                                selectedTrack = tracks[i];
                            done = true;
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
        let x = ((long - panLocation.long + 380) % 360 - 20) / mapViewWidth() * WIDTH;
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

    // GUI

    let categorySelect,
        typeSelect;

    window.onload = function(){
        let dropdowns = document.createElement('div');
        dropdowns.style.marginTop = '1em';
        document.body.appendChild(dropdowns);

        function dropdown(id, label, data){
            let drop = document.createElement('select');
            drop.id = id;
            let l = document.createElement('label');
            l.htmlFor = drop.id;
            l.innerText = label;
            dropdowns.appendChild(l);
            dropdowns.appendChild(drop);
            dropdowns.appendChild(document.createElement('br'));
    
            for(let key in data){
                let o = document.createElement('option');
                o.value = key;
                o.innerText = key;
                drop.appendChild(o);
            }

            return drop;
        }
        
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

        categorySelect = dropdown('category-select', 'Select Category:', categorySelectData);
        categorySelect.onchange = function(){
            categoryToPlace = categorySelectData[categorySelect.value];
        };

        let typeSelectData = {
            'Tropical': 0,
            'Subtropical': 1,
            'Non-Tropical': 2
        };

        typeSelect = dropdown('type-select', 'Select Type:', typeSelectData);
        typeSelect.onchange = function(){
            typeToPlace = typeSelectData[typeSelect.value];
        };

        let buttons = document.createElement('div');
        buttons.style.marginTop = '1em';
        document.body.appendChild(buttons);

        function button(label){
            let b = document.createElement('button');
            b.innerText = label;
            b.style.marginRight = '1em';
            buttons.appendChild(b);
            buttons.appendChild(document.createElement('br'));
            return b;
        }

        function checkbox(id, label){
            let b = document.createElement('input');
            b.type = 'checkbox';
            b.id = id;
            let l = document.createElement('label');
            l.htmlFor = b.id;
            l.innerText = label;
            buttons.appendChild(l);
            buttons.appendChild(b);
            buttons.appendChild(document.createElement('br'));
            return b;
        }

        let deselectButton = button('Deselect Track');
        deselectButton.onclick = function(){
            selectedTrack = undefined;
            selectedDot = undefined;
            if(hideNonSelectedTracks)
                hideNonSelectedTracks = false;
            refreshGUI();
        };

        let singleTrackCheckbox = checkbox('single-track-checkbox', 'Single Track Mode');
        singleTrackCheckbox.onclick = function(){
            if(selectedTrack)
                hideNonSelectedTracks = singleTrackCheckbox.checked;
        };

        let deletePointsCheckbox = checkbox('delete-points-checkbox', 'Delete Track Points');
        deletePointsCheckbox.onclick = function(){
            deleteTrackPoints = deletePointsCheckbox.checked;
        }

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
        };

        refreshGUI();
    };

    _p5.keyTyped = function(){
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
            if(hideNonSelectedTracks)
                hideNonSelectedTracks = false;
        }else if(key === 'h'){
            if(selectedTrack)
                hideNonSelectedTracks = !hideNonSelectedTracks;
        }else if(key === 'q')
            deleteTrackPoints = !deleteTrackPoints;
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
