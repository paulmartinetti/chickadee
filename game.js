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
    // tracking pause time
    this.inst = 0;
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
        hop: 100,
    };
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

    // cheese
    this.chzA = [];
}

function create() {

    // background photo
    this.bg = this.add.sprite(0, 0, 'bg').setDepth(1).setOrigin(0, 0).setInteractive();

    // instructions
    //let text = "Appuyez sur le rebord pour nourrir l'oiseau";
    //this.instr = this.add.text(150, 260, text).setDepth(2).setFont('36px Arial').setAlign('center').setColor('#000000');


    /**
     * 
     * chick - created, no seen; origin is bottom right bc of animations, depth of 5
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

    /**
     *  cheese
     */

    // put a cheese down
    this.bg.on('pointerdown', function (pointer, localX, localY) {

        // sur le rebord
        if (pointer.y > 700) {
            let chz = this.add.sprite(pointer.x, pointer.y, 'fromage').setDepth(4);
            chz.cx = pointer.x;
            chz.cy = pointer.y;

            // add to array
            this.chzA.push(chz);
        }

    }, this);

}

// about 100 times per second
function update() {

    // wait for cheese
    if (this.etat == 0) {
        if (this.chzA.length > 0) {
            this.etat = 1;
        } else {
            return;
        }
    }

    // pause waiting for chick - about 2 secs
    if (this.etat == 1) {
        // var dedie du temps
        this.inst++;
        if (this.inst > 150) {
            // bird lands
            this.etat = 2;
            // reset
            this.inst = 0;
        }
    }

    // bring in pigeon, rnd location sur le rebord - once
    if (this.etat == 2) {
        // add a chick in one of two spots
        let ind = this.rnd() > 0.5 ? 1 : 0;

        // store and update x, y data before moving
        this.chick.cx = this.chick.x = this.rebordA[ind].rx;
        this.chick.cy = this.chick.y = this.rebordA[ind].ry;

        // facing right or left
        this.chick.scaleX = this.rebordA[ind].rs;

        // shadow underneath (half the display width of bird)
        this.om = this.add.sprite(this.chick.cx - (this.chick.displayWidth / 2), this.chick.cy, 'ombre').setDepth(2);
        this.om.setScale(3);

        // eating sound during animation
        /* this.chick.on('animationupdate-eat', function () {
            this.peck.play();
        }, this);

        // done eating
        this.chick.on('animationcomplete-eat', function () {
            this.etat = 4;
        }, this); */

        // ready to gest
        this.etat = 3;
    }

    // natural gestes, not pursing food
    /**
     * this.mvmt1A = [{ f: 0, t: 3 }, { f: 7, t: 1 }, { f: 8, t: 1 }, { f: 0, t: 3 }];
     * this.mInd = 0;
     * this.mLen = this.mvmt1.length;
     */
    if (this.etat == 3) {

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

    // hop closer to cheese
    if (this.etat == 4) {
        return;
        // move X
        if (this.chz.cx < this.chick.x) {
            // look left
            this.chick.scaleX = -1 * this.conf.chScale;
            // move left
            this.moveX = -1 * this.conf.hop;
            // adjust if arrived
            let calcX = this.chick.x += this.moveX;
            if (calcX < this.chz.cx) this.moveX = 0;
        } else {
            // look right
            this.chick.scaleX = this.conf.chScale;
            // move right
            this.moveX = this.conf.hop;
            // adjust if arrived
            let calcX = this.chick.x += this.moveX;
            if (calcX > this.chz.cx) this.moveX = 0;
        }
        // move y
        if (this.chz.cy > this.chick.y) {
            // move down
            this.moveY = this.conf.hop;
        } else {
            this.moveY = 0;
        }

        // arrived
        if (this.moveX == 0 && this.moveY == 0) {
            this.etat = 3;
            return;
        }

        // move
        this.chick.x += this.moveX;
        this.chick.y += this.moveY;

        // pause
        this.etat = 0;
    }

    // peck
    if (this.etat == 5) {
        this.chick.play('eat', true);
    }


    /**
     * pigeon etat
     * 0 = not moving, not eating, calculating closest bread
     * 1 = bread available, moving toward closest bread
     * 2 = eating
     */



}


