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

    // cheese
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

    /**
     * game etat
     * 0 - waiting for cheese
     * 1 - waiting for chick ~ 2 secs
     * 2 - chick lands
     * 3 - 
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
        this.chick.cy = this.chick.y = this.rebordA[ind].ry;

        // facing right or left
        this.chick.scaleX = this.rebordA[ind].rs;

        // shadow underneath (half the display width of bird)
        this.om = this.add.sprite(this.chick.cx - (this.chick.displayWidth / 2), this.chick.cy, 'ombre').setDepth(2);
        this.om.setScale(3);

        // eating sound during animation
        this.chick.on('animationupdate-eat', function () {
            this.peck.play();
        }, this);

        // done eating
        this.chick.on('animationcomplete-eat', function () {
            this.etat = 4;
        }, this);

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

    // hop closer to cheese
    if (this.etat == 5) {
        
 // move X - going left
 if (this.chick.dx < 0) {
    // not more than a hop
    if (this.chick.dx > this.conf.hop){
        // ** update dx !!!
        this.moveX = -1 * this.conf.hop;
    } else {
        this.moveX = -1 * this.chick.dx;
    }
    // adjust if arrived
    if (this.p.x < this.nextB.bx) this.moveX = 0;
} else {
    // look right
    this.p.scaleX = -1;
    // move right
    this.moveX = this.step;
    // adjust if arrived
    if (this.p.x > this.nextB.bx) this.moveX = 0;
}
// move y
if (this.closestB.dy < 0) {
    this.moveY = -1 * this.step;
    // adjust if arrived
    if (this.pH(this.p.y) < this.nextB.by) this.moveY = 0;
} else {
    this.moveY = this.step;
    // adjust if arrived
    if (this.pH(this.p.y) > this.nextB.by) this.moveY = 0;
}

// always move after belly
if (this.p.anims.getProgress() * 10 > 6) {
    this.gp1S.play();
    this.p.x += this.moveX;
    this.p.y += this.moveY;
    // shadow
    this.om.x += this.moveX;
    this.om.y += this.moveY;
}

        
    }

    // peck
    if (this.etat == 6) {
        this.chick.play('eat', true);
    }






}


