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

    // pigeon
    this.load.atlas('chick', 'assets/images/spritesheet.png', 'assets/images/sprites.json');
    this.load.image('ombre', 'assets/images/ombre.png');

    // bread
    this.load.image('fromage', 'assets/images/fromage.png');

    // audio
    this.load.audio('peck', 'assets/audio/Cafetiere.mp3');

}

function init() {
    this.gameW = this.sys.game.config.width;
    this.gameH = this.sys.game.config.height;

    // landing spots, x, y, starting direction
    this.rebordA = [
        { rx: 520, ry: 665, rs: 1 },
        { rx: 700, ry: 670, rs: -1 }
    ];

    /**
     * Depths - background = 1
     *          cheese = 7
     *          chick = 5
     */

    // conf - initial vars
    this.conf = {
        insLen: 10,
        hop: 100,
    };
    // chick pauses before moving - etat = 0
    this.etat = 0;
    // tracking pause time
    this.inst = 0;
    // direction
    this.moveX = 0;
    this.moveY = 0;
    // random function
    this.rnd = function () { return Math.random() }
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
    this.mvmt1 = [{ f: 0, t: 3 }, { f: 7, t: 1 }, { f: 8, t: 1 }, { f: 0, t: 3 }];
    this.ind = 0;
    this.len = this.mvmt1.length;

}

function create() {

    // background photo
    this.bg = this.add.sprite(0, 0, 'bg').setDepth(1).setOrigin(0, 0).setInteractive();

    // instructions
    //let text = "Appuyez sur le rebord pour nourrir l'oiseau";
    //this.instr = this.add.text(150, 260, text).setDepth(2).setFont('36px Arial').setAlign('center').setColor('#000000');

    // add a chick in one of two spots
    let ind = this.rnd > 0.5 ? 1 : 0;
    // chick - origin is bottom center bc of animations

    // depth of 5
    this.chick = this.add.sprite(this.rebordA[ind].rx, this.rebordA[ind].ry, 'chick').setDepth(5).setOrigin(1, 1);
    // store and update x, y data before moving
    this.chick.cx = this.rebordA[ind].rx;
    this.chick.cy = this.rebordA[ind].ry;

    // facing right or left
    this.chick.scaleX = this.rebordA[ind].rs;

    // shadow underneath
    //this.om = this.add.sprite(this.chick.x, this.chick.y, 'ombre').setDepth(2).setOrigin(1, 1);
    //this.om.setScale(1.5);

    // audio - must be here in Scene create()
    this.peck = this.sound.add('peck');

    // eating
    this.anims.create({
        key: 'eat',
        frames: this.anims.generateFrameNames('chick', {
            prefix: 'chick',
            start: 0,
            end: 6,
            zeroPad: 1
        }),
        repeat: 0
    }, this);
    // eating sound during animation
    this.chick.on('animationupdate-eat', function () {
        this.peck.play();
    }, this);

    // done eating
    this.chick.on('animationcomplete-eat', function () {
        this.etat = 4;
    }, this);

    /**
     * 
     */

    // put a cheese down
    this.bg.on('pointerdown', function (pointer, localX, localY) {
        if (pointer.y > 700) {
            this.cheese = this.add.sprite(pointer.x, pointer.y, 'fromage').setDepth(4);
            this.cheese.cx = pointer.x;
            this.cheese.cy = pointer.y;
        }

    }, this);

}

// about 100 times per second
function update() {

    // pause
    if (this.etat == 0) {
        // capture cur movement
        let move = this.mvmt1[this.ind];
        
        // during mvmt

        if (this.inst > move.t * this.insLen) {
            // reset, move on
            this.inst = 0
            
        }

        // if this.ind < len .. 

        // set
        this.chick.setFrame("chick"+move.f);
        // next
        this.inst++;


    }

    // hop closer to cheese
    if (this.etat == 1) {
        // move X
        if (this.cheese.cx < this.chick.x) {
            // look left
            this.chick.scaleX = -1 * this.conf.chScale;
            // move left
            this.moveX = -1 * this.conf.hop;
            // adjust if arrived
            let calcX = this.chick.x += this.moveX;
            if (calcX < this.cheese.cx) this.moveX = 0;
        } else {
            // look right
            this.chick.scaleX = this.conf.chScale;
            // move right
            this.moveX = this.conf.hop;
            // adjust if arrived
            let calcX = this.chick.x += this.moveX;
            if (calcX > this.cheese.cx) this.moveX = 0;
        }
        // move y
        if (this.cheese.cy > this.chick.y) {
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
    if (this.etat == 3) {
        this.chick.play('eat', true);
    }


    /**
     * pigeon etat
     * 0 = not moving, not eating, calculating closest bread
     * 1 = bread available, moving toward closest bread
     * 2 = eating
     */



}


