var config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 1200,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    title: 'chickadee',
    pixelArt: false,
    backgroundColor: '555555'
};

// create game
var game = new Phaser.Game(config);

function preload() {

    // background photo
    this.load.image('bg', 'assets/images/rebord-c.jpg');

    // chick
    this.load.atlas('chickAtlas', 'assets/images/spritesheet.png', 'assets/images/sprites.json');
    this.load.image('ombre', 'assets/images/ombre.png');
    //console.log(this.textures.get('chickAtlas').frames);

    // cheese
    this.load.image('fromage', 'assets/images/fromage.png');

    // audio
    this.load.audio('song', 'assets/audio/Sunny Day-SoundBible-com-2064222612.mp3');

}
/**
 * 
 * global vars
 * 
 */


// state control var
var etat = 0;

// random function
var rnd = function () { return Math.random() }

// tracking pause times
var inst = 0;
// how long to pause, which etat est le prochain
function pausNxt(t, e) {
    // var dedie du temps
    inst++;
    if (inst > t) {
        // bird lands
        etat = e;
        // reset
        inst = 0;
    }
}

// landing spots, x, y, starting direction
var rebordA = [
    { rx: 520, ry: 665, rs: 1 },
    { rx: 700, ry: 670, rs: -1 }
];

// trying a 2-part hop with less X on the first half
var h2 = false;

/**
 * Head movement data pairs
 * {atlas frame, multiples of insLen}
 * pref 'chick'
 * 0 - stand
 * 1, 2 - bend
 * 3 - peck
 * 4 - look away
 * 5 - look at
 * 6 - cheese in beak
 * 7 - face wing up
 * 8 - face wing down
 * 9 - back wing up
 * 10 - back wing up
 * 
 */

// gestes
var mvmt1A = [{ f: 0, t: 3 }, { f: 4, t: 1 }, { f: 5, t: 1 }, { f: 0, t: 3 }];
var mInd = 0;
var mLen = mvmt1A.length;
var mPause = 20;

// flying in
var flyInA = [7, 8];
var flyOutA = [9, 10];
var flyInd = 0;
var flying = 0;
// num of update loops before changing textures
var flyP = 5;

// cheeses
var chzA = [];
var nextChz;

// peck
var peckA = [0, 1, 2, 3, 2, 6];
var pLen = peckA.length;
var peckInd = 0;
var pecking = 0;
var peckP = 3;

// direction
var moveX = 0;
var moveY = 0;
var hop = 180;

function create() {

    /**
    * Depths - background = 1
    *          cheese = 7
    *          chick = 5
    */

    // background photo
    this.bg = this.add.image(0, 0, 'bg').setDepth(1).setOrigin(0, 0).setInteractive();

    // audio - must be here in Scene create()
    this.song = this.sound.add('song', { loop: true });
    this.song.play();

    // instructions
    //let text = "Appuyez sur le rebord pour nourrir l'oiseau";
    //instr = this.add.text(150, 260, text).setDepth(2).setFont('36px Arial').setAlign('center').setColor('#000000');


    /**
     * 
     * chick - created, no seen; origin is bottom center, depth of 5
     * remade sprite P
     * 
     */
    this.chick = this.add.sprite(-100, -100, 'chickAtlas').setDepth(5).setOrigin(1, 1);

    // to control which face to use from atlas
    this.chick.face = function (n) {
        this.setTexture('chickAtlas', 'chick' + n);
    }

    // flying in and out
    this.chick.fly = function (flyA) {
        if (flying < flyP) {
            // pause
            flying++;
        } else {
            // flap
            flyInd = flyInd > 0 ? 0 : 1;
            this.face(flyA[flyInd]);
            flying = 0;
        }
    }

    // peck - pick up cheese
    this.chick.peck = function () {
        if (pecking < peckP) {
            // wait
            pecking++;
        } else {
            // progress through pecking array
            if (peckInd < pLen) {
                this.face(peckA[peckInd]);
                // cheese disappears
                if (peckInd == 3) nextChz.x = -100;
                peckInd++;
            } else {
                // have cheese
                nextChz.eaten = true;
                // reset
                pecking = 0;
                peckInd = 0;
                // next etat
                etat = 9;
            }

        }
    }

    /**
     *  cheese
     */

    // put a cheese down
    this.bg.on('pointerdown', function (pointer, localX, localY) {

        // sur le rebord
        if (pointer.y > 700) {
            let chz = this.add.image(pointer.x, pointer.y, 'fromage').setDepth(4);
            // use data first, then move chick
            chz.cx = pointer.x;
            chz.cy = pointer.y;
            // eaten state
            chz.eaten = false;
            // add to array
            chzA.push(chz);
        }

    }, this);
}

// about 100 times per second
function update() {
    //console.log(etat);
    /**
     * game etat
     * 0 - waiting for cheese
     * 1 - waiting for chick ~ 2 secs
     * 2 - chick lands
     * 3 - gests
     * 4 - confirm available cheese, choose one, calc distance
     * 5 - calc moveX, Y for one hop
     * 6 - hop closer to cheese
     * 
     */

    // wait for cheese
    if (etat == 0) {
        // 
        if (chzA.length > 0) {
            // if not eaten, pick first available cheese
            chzA.forEach(chz => {
                if (!chz.eaten) {
                    // there is cheese
                    nextChz = chz;
                    etat = 1;
                }
            });
        }
    }

    // pause waiting for chick to fly in - about 2 secs
    if (etat == 1) {
        // 150 loops, to etat 2
        pausNxt(150, 2);
    }

    // bring in chick, rnd location sur le rebord - once
    if (etat == 2) {

        // add a chick in one of two spots
        let ind = rnd() > 0.5 ? 1 : 0;

        // chick Sprite defined in Create()
        // store and update x, y data before moving
        this.chick.cx = this.chick.x = rebordA[ind].rx;
        // actual y value assigned later
        this.chick.cy = rebordA[ind].ry;

        // facing right or left
        this.chick.scaleX = rebordA[ind].rs;

        // shadow underneath (half the display width of bird)
        //this.om = this.add.sprite(this.chick.cx - (this.chick.displayWidth / 2), this.chick.cy, 'ombre').setDepth(2);
        //this.om.setScale(3);

        // ready to gest
        etat = 2.5;
    }

    /**
     * 
     * flying in
     * flyInA = [7, 8];
     * flyInd = 0;
     * flying = 0;
     * 
     */
    if (etat == 2.5) {
        // 
        if (this.chick.y < this.chick.cy) {
            // flapping
            this.chick.fly(flyInA);
            // smooth in
            this.chick.y += 30;
        } else {
            // stop flying
            this.chick.face(0);
            etat = 3;
        }
    }

    // natural gestes, not pursing food
    /**
     * mvmt1A = [{ f: 0, t: 3 }, { f: 7, t: 1 }, { f: 8, t: 1 }, { f: 0, t: 3 }];
     * mInd = 0;
     * mLen = this.mvmt1.length;
     */
    if (etat == 3) {

        // if still movements left to do
        if (mInd < mLen) {

            // capture cur movement
            let move = mvmt1A[mInd];
            // set

            this.chick.face(move.f);
            //console.log(this.chick.frame.name);

            // check time of movement
            if (inst < move.t * mPause) {
                inst++;

            } else {
                // reset, move on
                mInd++;
                inst = 0;
            }
            // done w movements
        } else {
            // reset mvmt
            mInd = 0;
            // move on to eat
            etat = 4;
        }
    }
    // choose a cheese
    if (etat == 4) {
        // capture distance and direction to cheese
        this.chick.dx = nextChz.cx - this.chick.cx;
        this.chick.dy = nextChz.cy - this.chick.cy;
        etat = 5;
    }

    // calculate one hop closer to cheese
    if (etat == 5) {
        // move X - going left
        if (this.chick.dx <= 0) {
            // look left
            this.chick.scaleX = -1;
            // distance more than a hop 
            if (Math.abs(this.chick.dx) > hop) {
                // how much to move
                moveX = -1 * hop;
            } else {
                moveX = -1 * Math.abs(this.chick.dx);
            }
            // adjust if arrived
            if (this.chick.cx < nextChz.cx) moveX = 0;
        } else {
            // move right
            // look right
            this.chick.scaleX = 1;
            if (this.chick.dx > hop) {
                // how much to move
                moveX = hop;
            } else {
                moveX = this.chick.dx;
            }
            // adjust if arrived
            if (this.chick.cx > nextChz.cx) moveX = 0;
        }
        // move Y - going up (rare)
        if (this.chick.dy < 0) {
            // distance more than a hop 
            if (Math.abs(this.chick.dy) > hop) {
                // how much to move
                moveY = -1 * hop;
            } else {
                moveY = -1 * this.chick.dy;
            }
            // adjust if arrived
            if (this.chick.cy < nextChz.cy) moveY = 0;
        } else {
            // move right
            if (this.chick.dy > hop) {
                // how much to move
                moveY = hop;
            } else {
                moveY = this.chick.dy;
            }
            // adjust if arrived
            if (this.chick.cy > nextChz.cy) moveY = 0;
        }

        // calc until arrived
        if (Math.abs(moveY) > 0 || Math.abs(moveX) > 0) {
            etat = 6;
        } else {
            etat = 8;
        }

    }
    if (etat == 6) {
        // slow animation, do two-move hop, then pause, then eat
        let xhalf;
        // separate first and 2nd hop (note 70 / 30 does not work)
        if (!h2) {
            xhalf = 0.75;
            h2 = true;
            // dip head forward when hopping
            this.chick.face(1);
        } else {
            xhalf = 0.25;
            h2 = false;
        }
        // update
        // data x, y
        this.chick.cx += (moveX * xhalf);
        // distance from cheese
        this.chick.dx -= moveX * xhalf;
        // actual chick
        this.chick.x = this.chick.cx;

        this.chick.cy += (moveY * 0.5);
        this.chick.dy -= Math.abs(moveY * 0.5);
        this.chick.y = this.chick.cy;
        // shadow
        // this.om.x += moveX;
        //this.om.y += moveY; 
        if (!h2) etat = 7;
    }
    // pause before hopping again, back to etat = 5
    if (etat == 7) {
        // stand back up
        this.chick.face(0);
        // 150 loops, to etat 5
        pausNxt(70, 5);
    }
    // peck
    if (etat == 8) {
        // advances to next etat at end
        this.chick.peck();
    }
    // look at viewer
    if (etat == 9) {
        // 150 loops, to etat 5
        pausNxt(70, 10);
    }
    // turn and go
    if (etat == 10) {
        this.chick.face(4);
        let ind = rnd() > 0.5 ? 1 : 0;
        // chick Sprite defined in Create()
        // store and update x, y data before moving
        this.chick.cx = this.chick.x = rebordA[ind].rx;
        // actual y value assigned later
        this.chick.cy = this.chick.y = rebordA[ind].ry;
        etat = 11;
    }
    if (etat == 11) {
        pausNxt(30, 12);
    }
    if (etat == 12) {
        if (this.chick.y > 0) {
            // flapping
            this.chick.fly(flyOutA);
            // smooth out
            this.chick.y -= 50;
        } else {
            // stop flying
            this.chick.face(0);
            etat = 0;
        }
    }

}




