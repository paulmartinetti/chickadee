var config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 1200,
    scene: {
        preload: preload,
        init: init,
        create: create,
        update: update
    },
    title: 'chickadee',
    pixelArt: false,
    backgroundColor: '555555'
};

// global vars

var game = new Phaser.Game(config);

function preload() {

    // background photo
    this.load.image('bg', 'assets/images/rebord-c.jpg');

    // chick
    this.load.atlas('chickAtlas', 'assets/images/spritesheet.png', 'assets/images/sprites.json');
    this.load.atlas('chickfly', 'assets/images/chickfly.png', 'assets/images/chickfly.json');
    this.load.image('ombre', 'assets/images/ombre.png');
    //console.log(this.textures.get('chickAtlas').frames);

    // cheese
    this.load.image('fromage', 'assets/images/fromage.png');

    // audio
    this.load.audio('peck', 'assets/audio/Cafetiere.mp3');

}

function init() {

    this.gameW = this.sys.game.config.width;
    this.gameH = this.sys.game.config.height;

    /**
     * Depths - background = 1
     *          cheese = 7
     *          chick = 5
     */


    // waiting for cheese
    this.etat = 0;

    // random function
    this.rnd = function () { return Math.random() }

    // landing spots, x, y, starting direction
    this.rebordA = [
        { rx: 520, ry: 665, rs: 1 },
        { rx: 700, ry: 670, rs: -1 }
    ];
    // conf - initial vars
    this.conf = {
        insLen: 20,
        hop: 180,
    };

    // trying a 2-part hop with less X on the first half
    this.h2 = false;

    // tracking pause times
    this.inst = 0;
    // how long to pause, which etat est le prochain
    this.pausNxt = function (t, e) {
        // var dedie du temps
        this.inst++;
        if (this.inst > t) {
            // bird lands
            this.etat = e;
            // reset
            this.inst = 0;
        }
    }
    /**
     * Head movement data pairs
     * {atlas frame, multiples of insLen}
     * pref 'chick'
     * 0, 6 - stand
     * 1, 5 - bend
     * 3 - peck
     * 7 - look left
     * 8 - look right
     */

    this.mvmt1A = [{ f: 0, t: 3 }, { f: 7, t: 1 }, { f: 8, t: 1 }, { f: 0, t: 3 }];
    this.mInd = 0;
    this.mLen = this.mvmt1A.length;
    // direction
    this.moveX = 0;
    this.moveY = 0;

    // cheeses
    this.chzA = [];
    this.nextChz;
}

function create() {

    // background photo
    this.bg = this.add.sprite(0, 0, 'bg').setDepth(1).setOrigin(0, 0).setInteractive();

    // instructions
    //let text = "Appuyez sur le rebord pour nourrir l'oiseau";
    //this.instr = this.add.text(150, 260, text).setDepth(2).setFont('36px Arial').setAlign('center').setColor('#000000');


    /**
     * 
     * chick - created, no seen; origin is bottom center, depth of 5
     * remade sprite P
     * 
     */
    this.chick = this.add.sprite(-100, -100, 'chickAtlas').setDepth(5).setOrigin(1, 1);

    // to control texture (gestes) from atlas
    this.psn = function (n) {
        this.chick.setTexture('chickAtlas', 'chick' + n);
    }

    // audio - must be here in Scene create()
    this.peck = this.sound.add('peck');

    // eating
    this.anims.create({
        key: 'eat',
        frames: this.anims.generateFrameNames('chickAtlas', {
            prefix: 'chick',
            start: 0,
            end: 6,
            zeroPad: 1,
        }),
        repeat: 0
    }, this);
    //this.chick.play('eat', true);

    // flying
    this.anims.create({
        key: 'fly',
        frames: this.anims.generateFrameNames('chickfly', {
            prefix: 'fly',
            start: 0,
            end: 1,
            zeroPad: 1,
        }),
        repeat: 25
    }, this);

    /**
     *  cheese
     */

    // put a cheese down
    this.bg.on('pointerdown', function (pointer, localX, localY) {

        // sur le rebord
        if (pointer.y > 700) {
            let chz = this.add.sprite(pointer.x, pointer.y, 'fromage').setDepth(4);
            // use data first, then move chick
            chz.cx = pointer.x;
            chz.cy = pointer.y;
            // eaten state
            chz.eaten = false;
            // add to array
            this.chzA.push(chz);
        }

    }, this);
}

// about 100 times per second
function update() {
    //console.log(this.etat);
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
    if (this.etat == 0) {
        if (this.chzA.length > 0) {
            this.etat = 1;
        } else {
            return;
        }
    }

    // pause waiting for chick to fly in - about 2 secs
    if (this.etat == 1) {
        // 150 loops, to etat 2
        this.pausNxt(150, 2);
    }

    // bring in chick, rnd location sur le rebord - once
    if (this.etat == 2) {

        // add a chick in one of two spots
        let ind = this.rnd() > 0.5 ? 1 : 0;

        // chick Sprite defined in Create()
        // store and update x, y data before moving
        this.chick.cx = this.chick.x = this.rebordA[ind].rx;
        this.chick.cy = this.rebordA[ind].ry;

        // facing right or left
        this.chick.scaleX = this.rebordA[ind].rs;

        // shadow underneath (half the display width of bird)
        //this.om = this.add.sprite(this.chick.cx - (this.chick.displayWidth / 2), this.chick.cy, 'ombre').setDepth(2);
        //this.om.setScale(3);

        // eating sound during animation
        /* this.chick.on('animationupdate-eat', function () {
            this.peck.play();
        }, this);

        // done eating
        this.chick.on('animationcomplete-eat', function () {
            this.etat = 4;
        }, this); */

        // ready to gest
        this.etat = 2.5;
    }

    // fly in
    if (this.etat == 2.5) {
        // 150 loops, to etat 2
        if (this.chick.y < this.chick.cy) {
            this.chick.play("fly", true);
            this.chick.y += 20;
        } else {
            this.etat = 3;
        }
    }

    // natural gestes, not pursing food
    /**
     * this.mvmt1A = [{ f: 0, t: 3 }, { f: 7, t: 1 }, { f: 8, t: 1 }, { f: 0, t: 3 }];
     * this.mInd = 0;
     * this.mLen = this.mvmt1.length;
     */
    if (this.etat == 3) {

        // stop flying
        this.psn(0);

        // if still movements left to do
        if (this.mInd < this.mLen) {

            // capture cur movement
            let move = this.mvmt1A[this.mInd];
            // set

            this.psn(move.f);
            //console.log(this.chick.frame.name);

            // check time of movement
            if (this.inst < move.t * this.conf.insLen) {
                this.inst++;

            } else {
                // reset, move on
                this.mInd++;
                this.inst = 0;
            }
            // done w movements
        } else {
            // reset mvmt
            this.mInd = 0;
            // move on to eat
            this.etat = 4;
        }
    }
    // choose a cheese
    if (this.etat == 4) {
        // look for closest bread
        let yena = false;
        // if not eaten, pick first available cheese
        this.chzA.forEach(chz => {
            if (!chz.eaten) {
                // there is cheese
                yena = true;
                // capture distance and direction to cheese
                this.chick.dx = chz.cx - this.chick.cx;
                this.chick.dy = chz.cy - this.chick.cy;
                // includes direction
                // for chick mvmnt and collision detection
                this.nextChz = chz;
            }
        });
        // there is cheese, go get it
        if (yena) this.etat = 5;
    }

    // calculate one hop closer to cheese
    if (this.etat == 5) {
        // move X - going left
        if (this.chick.dx < 0) {
            // look left
            this.chick.scaleX = -1;
            // distance more than a hop 
            if (Math.abs(this.chick.dx) > this.conf.hop) {
                // how much to move
                this.moveX = -1 * this.conf.hop;
            } else {
                this.moveX = -1 * Math.abs(this.chick.dx);
            }
            // adjust if arrived
            if (this.chick.cx < this.nextChz.cx) this.moveX = 0;
        } else {
            // move right
            // look right
            this.chick.scaleX = 1;
            if (this.chick.dx > this.conf.hop) {
                // how much to move
                this.moveX = this.conf.hop;
            } else {
                this.moveX = this.chick.dx;
            }
            // adjust if arrived
            if (this.chick.cx > this.nextChz.cx) this.moveX = 0;
        }
        // move Y - going up (rare)
        if (this.chick.dy < 0) {
            // distance more than a hop 
            if (Math.abs(this.chick.dy) > this.conf.hop) {
                // how much to move
                this.moveY = -1 * this.conf.hop;
            } else {
                this.moveY = -1 * this.chick.dy;
            }
            // adjust if arrived
            if (this.chick.cy < this.nextChz.cy) this.moveY = 0;
        } else {
            // move right
            if (this.chick.dy > this.conf.hop) {
                // how much to move
                this.moveY = this.conf.hop;
            } else {
                this.moveY = this.chick.dy;
            }
            // adjust if arrived
            if (this.chick.cy > this.nextChz.cy) this.moveY = 0;
        }
        // calc until arrived
        if (Math.abs(this.moveY) > 0 || Math.abs(this.moveX) > 0) {
            this.etat = 6;
        } else {
            this.etat = 8;
        }

    }
    if (this.etat == 6) {
        // slow animation, do two-move hop, then pause, then eat
        let xhalf;
        // separate first and 2nd hop
        if (!this.h2) {
            xhalf = 0.25;
            this.h2 = true;
        } else {
            xhalf = 0.75;
            this.h2 = false;
        }
        // update
        // data x, y
        this.chick.cx += (this.moveX * xhalf);
        // distance from cheese
        this.chick.dx -= Math.abs(this.moveX * xhalf);
        // actual chick
        this.chick.x = this.chick.cx;

        this.chick.cy += (this.moveY * 0.5);
        this.chick.dy -= Math.abs(this.moveY * 0.5);
        this.chick.y = this.chick.cy;
        // shadow
        // this.om.x += this.moveX;
        //this.om.y += this.moveY; 
        if (!this.h2) this.etat = 7;       
    }
     // pause before moving again, back to etat = 5
    if (this.etat == 7) {
        // 150 loops, to etat 5
        this.pausNxt(70, 5);
    }
    // peck
    if (this.etat == 8) {
        this.chick.play('eat', true);
        this.etat = 9;
    }
}




