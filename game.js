/*jslint nomen: true*/ //disables alerts about dangling '_'

//point class
var Vector = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;

    Object.defineProperty(this, "r", {
        set: function (r) {
            var tempa = this.a;
            this.x = r * Math.cos(tempa);
            this.y = r * Math.sin(tempa);
        },
        get: function () {
            return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        }
    });
    Object.defineProperty(this, "a", {
        set: function (a) {
            var tempr = this.r;
            this.x = tempr * Math.cos(a);
            this.y = tempr * Math.sin(a);
        },
        get: function () {
            return Math.atan2(this.y, this.x);
        }
    });
};

//takes two objects with x, y, h, w, and returns the distace between their centers
function distance(a, b) {
    return Math.sqrt(Math.pow(((a.x || 0) + (a.w || 0) / 2) - ((b.x || 0) + (b.w || 0) / 2), 2) + Math.pow(((a.y || 0) + (a.h || 0) / 2) - ((b.y || 0) + (b.h || 0) / 2), 2));
}


//entry point
window.onload = function () {
    var WIDTH = 800;
    var HEIGHT = 600;
    var PANELHEIGHT = 100;

    Crafty.init(WIDTH, HEIGHT + PANELHEIGHT);

    var BALL = "circle.png";
    var PLAYER = "player.png";
    var PICKUP = "pickup.png";
    var BADUP = "badup.png";
    var PANEL = "panel.png";
    var BEAM = "beam.png";
    var MARKER = "marker.png";

    Crafty.sprite(100, BALL, {
        Ball: [0, 0]
    });
    Crafty.sprite(16, PLAYER, {
        Player: [0, 0]
    });
    Crafty.sprite(8, PICKUP, {
        Pickup: [0, 0]
    });
    Crafty.sprite(8, BADUP, {
        Badup: [0, 0]
    });
    Crafty.sprite(1, PANEL, {
        Panel: [0, 0]
    });
    Crafty.sprite(BEAM, {
        Beam: [0, 0, 100, 4]
    });
    Crafty.sprite(MARKER, {
        Marker: [0, 0, 17, 20]
    });


    //custom components
    //adds cx and cy as coordintes of the center of a object with a "2D" component
    //remake with defineProperty, add setters
    Crafty.c("Center", {
        init: function () {
            if (this.hasOwnProperty("_x") && this.hasOwnProperty("_w")) {
                Object.defineProperty(this, "cx", {
                    set: function (cx) {
                        this.x = cx - this._w / 2;
                    },
                    get: function () {
                        return this._x + this._w / 2;
                    }
                });

            }
            if (this.hasOwnProperty("_y") && this.hasOwnProperty("_h")) {
                Object.defineProperty(this, "cy", {
                    set: function (cy) {
                        this.y = cy - this._h / 2;
                    },
                    get: function () {
                        return this._y + this._h / 2;
                    }
                });
            }
        }
    });


    //scenes
    //main
    Crafty.scene("Main", function () {
        Crafty.background("#222");
        //actors
        var ball, player;
        //vectors
        var velocity = new Vector();
        var mousePos = new Vector(WIDTH / 2, HEIGHT / 2);
        //arrays for ups
        var pickups = [];
        var badups = [];
        //z values
        var zValues = {
            mouseTracker: 1000,
            marker: 910,
            beam: 909,
            panel: 900,
            score: 800,
            player: 20,
            pickups: 16,
            badups: 15,
            ball: 10
        };
        //constants
        //ballSize / 2, range, popinRange (stands in for mass of ball)
        //popout range, multiple of popute range (form 1 to 5-ish)
        //force
        //damping
        var constants = {
            ballSize: 100, //diameter
            range: 50, //same as popinRange, half ball size
            force: 1,
            damping: 0.02, //from 0 to 1
            pickupRange: 10,
            popoutRange: 150,
            popinRange: 50, //same as range, half ball size
            upFrequency: 40, //every how many frames
            upBorder: 50 //in px how far away from edges

        };


        //global mouse tracker
        Crafty.e("2D, Mouse")
            .attr({x: 0, y: 0, w: WIDTH, h: HEIGHT, z: zValues.mouseTracker})
            .bind("MouseMove", function (e) {
                mousePos.x = e.x;
                mousePos.y = e.y;
                //Crafty.trigger("GlobalMouseMoved", e);
            })
            .bind("MouseOver", function (e) {
                Crafty.canvas.context.canvas.style.cursor = "none";
            });

        //panel
        var panel = Crafty.e("2D, Canvas, Panel, Mouse")
            .attr({x: 0, y: HEIGHT, w: WIDTH, h: PANELHEIGHT, z: zValues.panel})
            .bind("MouseOver", function (e) {
                Crafty.canvas.context.canvas.style.cursor = "default";
            });



        //slider
        var forceText = Crafty.e("2D, DOM, Text")
            .attr({w: 500, x: 5, y: -20, z: zValues.marker})
            .text("Force: 0%")
            .css({"color": "lightgrey"});
        Object.defineProperty(forceText, "_value", {
            value: 0,
            writable: true
        });
        Object.defineProperty(forceText, "value", {
            set: function (val) {
                this._value = val;
                this.text("Force: " + val + "%");
            }
        });
        var forceBeam = Crafty.e("2D, Canvas, Beam")
            .attr({x: 0, y: 0, w: 100, h: 4, z: zValues.beam});
        var forceMarker = Crafty.e("2D, Canvas, Marker, Mouse, Center")
            .attr({x: -7, y: 0, w: 17, h: 20, z: zValues.marker})
            .bind("MouseDown", function (e) {
                this.bind("MouseMove", function (e) {
                    if (e.x >= this._parent.x && e.x <= this._parent.x + forceBeam.w) {
                        this.x = e.x - this.w / 2;
                        constants.force = 0.1 + (this.cx - forceBeam.x) / 100 * 2;
                        forceText.value = this.cx - forceBeam.x;
                    }
                });
                this.bind("MouseUp", function (e) {
                    this.unbind("MouseMove");
                    this.unbind("MouseUp");
                    this.unbind("MouseOut");
                });
                this.bind("MouseOut", function (e) {
                    this.unbind("MouseMove");
                    this.unbind("MouseUp");
                    this.unbind("MouseOut");
                });
            });
        var forceSlider = Crafty.e("2D")
            .attach(forceBeam)
            .attach(forceMarker)
            .attach(forceText)
            .attr({x: 50, y: HEIGHT + 50});


        //score
        var score = Crafty.e("2D, DOM, Text")
            .attr({w: 500, x: 20, y: 20, z: zValues.score})
            .text("SCORE: 0")
            .css({"color": "lightgrey"});
        Object.defineProperty(score, "_value", {
            value: 0,
            writable: true
        });
        Object.defineProperty(score, "value", {
            set: function (val) {
                if (val < 0) {
                    val = 0;
                }
                this._value = val;
                this.text("SCORE: " + val);
            },
            get: function () {
                return this._value;
            }
        });


        //player
        player = Crafty.e("2D, Center, Canvas, Player")
            .attr({w: 16, h: 16, x: WIDTH / 2, y: HEIGHT / 2, z: zValues.player})
            .bind("EnterFrame", function (e) {
                var diff =  new Vector(mousePos.x - ball.cx, mousePos.y - ball.cy);
                var distanceFromBall = diff.r;
                if (this.inside) {
                    diff.r = constants.popinRange * -(Math.pow(diff.r / constants.popoutRange - 1, 2) - 1);
                    this.cx = ball.cx + diff.x;
                    this.cy = ball.cy + diff.y;
                    if (distanceFromBall > constants.popoutRange) {
                        this.inside = false;
                    }
                } else {
                    this.cx = mousePos.x;
                    this.cy = mousePos.y;
                    if (distanceFromBall < constants.popinRange) {
                        this.inside = true;
                    }
                }
            });
        Object.defineProperty(player, "inside", {
            value: false,
            writable: true
        });


        //ball
        ball = Crafty.e("2D, Center, Mouse, Canvas, Ball")
            .attr({w: constants.ballSize, h: constants.ballSize, x: 500, y: 300, z: zValues.ball})
            .areaMap([0, 0], [50, 0], [50, 50], [0, 50])
            .bind("EnterFrame", function (e) {
                //damping
                velocity.x *= 1 - constants.damping;
                velocity.y *= 1 - constants.damping;

                //accelerate ball
                if (distance(player, ball) <= constants.range) {
                    velocity.x += constants.force / constants.ballSize * (player.cx - ball.cx);
                    velocity.y += constants.force / constants.ballSize * (player.cy - ball.cy);
                }

                //move ball
                this.x += velocity.x;
                this.y += velocity.y;

                //bounce off walls
                if (this.x + this.w > WIDTH && velocity.x > 0) {
                    velocity.x = -velocity.x;
                }
                if (this.x < 0 && velocity.x < 0) {
                    velocity.x = -velocity.x;
                }
                if (this.y + this.h > HEIGHT && velocity.y > 0) {
                    velocity.y = -velocity.y;
                }
                if (this.y < 0 && velocity.y < 0) {
                    velocity.y = -velocity.y;
                }
            });


        //main loop
        Crafty.bind("EnterFrame", function (e) {
            var i;
            //see if colided with an up
            for (i = 0; i < pickups.length; i++) {
                if (constants.pickupRange > distance(player, pickups[i])) {
                    pickups[i].destroy();
                    pickups.splice(i, 1);
                    score.value += 100;
                }
            }
            for (i = 0; i < badups.length; i++) {
                if (constants.pickupRange > distance(player, badups[i])) {
                    badups[i].destroy();
                    badups.splice(i, 1);
                    score.value -= 100;
                }
            }

            //burn points if outside
            if (player.inside === false) {
                score.value -= 3;
            }

            //add pickups and badups
            if (Crafty.frame() % 40 === 0) {
                pickups.push(
                    Crafty.e("2D, Center, Canvas, Pickup")
                        .attr({w: 8, h: 8, x: Math.floor(Math.random() * (WIDTH - 2 * constants.upBorder) + constants.upBorder), y: Math.floor(Math.random() * (HEIGHT - 2 * constants.upBorder) + constants.upBorder), z: zValues.pickups})
                );
                badups.push(
                    Crafty.e("2D, Center, Canvas, Badup")
                        .attr({w: 8, h: 8, x: Math.floor(Math.random() * (WIDTH - 2 * constants.upBorder) + constants.upBorder), y: Math.floor(Math.random() * (HEIGHT - 2 * constants.upBorder) + constants.upBorder), z: zValues.badups})
                );
            }

        });

        //this has to be here, if moved does not work, don't know why, must be sofware goblins.
        Crafty.canvas.context.canvas.style.cursor = "none";
    });

    //menu
    Crafty.scene("Menu", function () {
    });

    //loading
    Crafty.scene("Loading", function () {
        Crafty.background("#FAC");

        Crafty.e("2D, DOM, Text")
            .attr({w: 800, h: 40, x: 0, y: 300})
            .text("LOADING...")
            .css({"text-align": "center", "color": "lightgrey", "font-size": "40px"});

        Crafty.load([BALL, PLAYER, PICKUP, BADUP, PANEL, MARKER, BEAM], function () {
            console.log("assets loaded");
            Crafty.scene("Main");
        });
    });

    Crafty.scene("Loading");
};
