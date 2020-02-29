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

    // move the y value of pigeon near visual center
    this.pH = function pH(ay) {
        //return ay;
        return ay - 100;
    }

    /**
     * Depths - background = 1
     *          cheese = 7
     *          chick = 5
     */
}

function create() {

    // background photo
    this.bg = this.add.sprite(0, 0, 'bg').setDepth(1).setOrigin(0, 0).setInteractive();

    // instructions
    //let text = "Appuyez sur le rebord pour nourrir l'oiseau";
    //this.instr = this.add.text(150, 260, text).setDepth(2).setFont('36px Arial').setAlign('center').setColor('#000000');

    // chick - origin is bottom center bc of animations, displayHeight = 232
    // depth of 5
    let dH = 269;
    this.c = this.add.sprite(500, (this.gameH - dH + 150), 'chick').setDepth(5).setOrigin(0.5, 1);
    this.c.setScale(0.65);
    console.log(this.c);
    return;
    // shadow underneath
    this.om = this.add.sprite(585, ((this.gameH / 2) + (232 / 2) - 5), 'ombre').setDepth(2);
    this.om.setScale(1.2);
    //console.log(this.p);

    // audio - must be here in Scene create()
    this.jackS = this.sound.add('jack');
    this.gp1S = this.sound.add('gp1');

    // walking
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNames('pigeon', {
            prefix: 'body_',
            start: 0,
            end: 16,
            zeroPad: 1
        }),
        repeat: 0
    }, this);

    // eatForwards
    this.anims.create({
        key: 'eatF',
        frames: this.anims.generateFrameNames('pigeon', {
            prefix: 'body_',
            start: 16,
            end: 28,
            zeroPad: 1
        }),
        repeat: 0,
    }, this);
    // eating sound during animation
    this.p.on('animationupdate-eatF', function () {
        this.jackS.play();
    }, this);

    // done eating
    this.p.on('animationcomplete-eatF', function () {
        // remove bread from stage
        this.nextB.x = -500;
        // pursue any remaining bread
        this.etat = 0;
    }, this);

    // eatBackwards
    this.anims.create({
        key: 'eatB',
        frames: this.anims.generateFrameNames('pigeon', {
            prefix: 'body_',
            start: 29,
            end: 40,
            zeroPad: 1
        }),
        repeat: 0,
    });
    // eating sound during animation
    this.p.on('animationupdate-eatB', function () {
        this.jackS.play();
    }, this);

    // done eating
    this.p.on('animationcomplete-eatB', function () {
        // remove bread from stage
        this.nextB.x = -500;
        // pursue any remaining bread
        this.etat = 0;
    }, this);
    //


    /**
     * User clicks on sidewalk, bread appears, pigeon walks over and eats it
     */

    // listen for finger or mouse press on the sidewalk (y between 232 and 1196)
    this.bg.on('pointerdown', function (pointer, localX, localY) {

        // remove instructions
        this.instr.x = 1300;

        // must be on the sidewalk
        if (pointer.downY < 232) return;

        // put bread on ground - display W=52, H=71, depth always covered by pigeon
        let br = this.add.sprite(pointer.downX, pointer.downY, 'pain').setDepth(3);

        // state of bread
        br.eaten = false;

        // store bread coordinates - center
        br.bx = pointer.downX;
        br.by = pointer.downY;

        // store all breads
        this.painA.push(br);

        // any new bread means reconsider pursuit of bread
        this.etat = 0;

    }, this);

}

function update() {
    return;

    /**
     * pigeon etat
     * 0 = not moving, not eating, calculating closest bread
     * 1 = bread available, moving toward closest bread
     * 2 = eating
     */

    // if bread available and pigeon not moving
    if (this.painA.length > 0 && this.etat == 0) {
        // bread is always closer than edges of game, start looking
        this.closestB = { dx: this.gameW, dy: this.gameH };
        // look for closest bread
        let yena = false;
        this.painA.forEach(pain => {
            // if not eaten, consider distance for closest (sum of x and y deltas)
            if (!pain.eaten) {
                // there is bread
                yena = true;
                // capture distance and direction to each bread
                let dx = pain.bx - this.p.x;
                // pH is pigeon head
                let dy = pain.by - this.pH(this.p.y);
                // this bread is closest, note it
                if ((Math.abs(dx) + Math.abs(dy)) < (Math.abs(this.closestB.dx) + Math.abs(this.closestB.dy))) {
                    // includes direction
                    this.closestB = { dx: dx, dy: dy };
                    // for pigeon movement and collision detection
                    this.nextB = pain;
                }

            }
        });
        // there is bread, go get it
        if (yena) this.etat = 1;
    }

    // set direction based on left / right or x movement
    if (this.etat == 1) {
        // moving to follow belly until arrived
        this.p.play('walk', true);

        // move X
        if (this.closestB.dx < 0) {
            // look left
            this.p.scaleX = 1;
            // move left
            this.moveX = -1 * this.step;
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

        // check for arrival at bread, two rectangles intersect
        let bRect = this.nextB.getBounds();
        let pRect = this.p.getBounds();
        if (Phaser.Geom.Intersects.RectangleToRectangle(bRect, pRect)) {
            // allow pigeon to move closer for eating animation
            let xDist = Math.abs(this.p.x - this.nextB.bx);
            let yDist = Math.abs(this.p.y - this.nextB.by);
            // okay to eat
            if (xDist < 70 && yDist < 150) this.etat = 2;
        }
    }
    // pigeon is eating
    if (this.etat == 2) {

        // if bread was above, eat behind
        this.p.y > this.nextB.by ? this.p.play('eatB', true) : this.p.play('eatF', true);

        // change bread state to eaten so it's no longer considered
        this.nextB.eaten = true;

    }

}


