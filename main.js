const TITLE = 'Hypo TC Track Maker';
const VERSION = '20200405a';

const WIDTH = 960;
const HEIGHT = 540;
const MAP_WIDTH = 3000;
const MAP_HEIGHT = MAP_WIDTH/2;

var loadedMapImg,
    mapImg,
    panLocation,
    zoomAmt;

function setup(){
    setVersion(TITLE + ' v',VERSION);
    document.title = TITLE;

    createCanvas(WIDTH,HEIGHT);

    zoomAmt = 0;
    panLocation = createVector(0);
    loadedMapImg = false;

    mapImg = createGraphics(MAP_WIDTH,MAP_HEIGHT);
    
    Promise.all([
        loadImg('resources/map_NW.jpg'),
        loadImg('resources/map_NE.jpg'),
        loadImg('resources/map_SW.jpg'),
        loadImg('resources/map_SE.jpg')
    ]).then(imgs=>{
        let nw = imgs[0];
        let ne = imgs[1];
        let sw = imgs[2];
        let se = imgs[3];
        mapImg.image(nw,0,0,MAP_WIDTH/2,MAP_HEIGHT/2);
        mapImg.image(ne,MAP_WIDTH/2,0,MAP_WIDTH/2,MAP_HEIGHT/2);
        mapImg.image(sw,0,MAP_HEIGHT/2,MAP_WIDTH/2,MAP_HEIGHT/2);
        mapImg.image(se,MAP_WIDTH/2,MAP_HEIGHT/2,MAP_WIDTH/2,MAP_HEIGHT/2);
        loadedMapImg = true;
    });
}

function draw(){
    background(255);
    if(loadedMapImg)
    {
        image(mapImg,0,HEIGHT-WIDTH/2,WIDTH,WIDTH/2,panLocation.x,panLocation.y,mapViewWidth(),mapViewHeight());
        text('Currently just a map you can pan and zoom lol',100,40);
    }
    else
        text('Loading...', 30,30);
}

function mouseWheel(evt){
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
        panLocation.x += dw*mx/viewerW;
        panLocation.y += dh*my/viewerH;
        if(panLocation.x < 0)
            panLocation.x = 0;
        if(panLocation.y < 0)
            panLocation.y = 0;
        if(panLocation.x + nw > MAP_WIDTH)
            panLocation.x = MAP_WIDTH - nw;
        if(panLocation.y + nh > MAP_HEIGHT)
            panLocation.y = MAP_HEIGHT - nh;
    }
}

function mouseDragged(evt){
    let mvw = mapViewWidth();
    let mvh = mapViewHeight();
    let viewerW = WIDTH;
    let viewerH = WIDTH/2;
    let dx = evt.movementX;
    let dy = evt.movementY;
    panLocation.x -= mvw*dx/viewerW;
    panLocation.y -= mvh*dy/viewerH;
    if(panLocation.x < 0)
        panLocation.x = 0;
    if(panLocation.y < 0)
        panLocation.y = 0;
    if(panLocation.x + mvw > MAP_WIDTH)
        panLocation.x = MAP_WIDTH - mvw;
    if(panLocation.y + mvh > MAP_HEIGHT)
        panLocation.y = MAP_HEIGHT - mvh;
}

function mapViewWidth(){
    return MAP_WIDTH*pow(1.25,-zoomAmt);
}

function mapViewHeight(){
    return MAP_HEIGHT*pow(1.25,-zoomAmt);
}

function mouseLong(){
    let left = panLocation.x/MAP_WIDTH*360-180;
    let right = (panLocation.x+mapViewWidth())/MAP_WIDTH*360-180;
    return left+mouseX/WIDTH*(right-left);
}

function mouseLat(){
    let top = 90-panLocation.y/MAP_HEIGHT*180;
    let bottom = 90-(panLocation.y+mapViewHeight())/MAP_HEIGHT*180;
    return top+(mouseY-(HEIGHT-WIDTH/2))/(WIDTH/2)*(bottom-top);
}

function loadImg(path){     // wrap p5.loadImage in a promise
    return new Promise((resolve,reject)=>{
        setTimeout(()=>{
            loadImage(path,resolve,reject);
        });
    });
}