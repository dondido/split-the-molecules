var GameEngine = function() {
    var system,
        particlesNumber,
        minGroups,
        numGroups,
        bounds,
        fps,
        pointer,
        passed,
        chainReaction = 0,
        canvas = document.getElementById("canvas"),
        context = canvas.getContext("2d");

    var adc = adc || {};

    adc.cash = {
        pi2: Math.PI * 2,
        customR: [2, 3, 6, 10, 14, 18]
    };

    adc.particleBase = {
        bounce: -1,
        hitTestWall: function() {
            if (this.x < bounds.x1) {
                this.x = bounds.x1;
                this.vx *= this.bounce;
            } else if (this.x > bounds.x2) {
                this.x = bounds.x2;
                this.vx *= this.bounce;
            }
            if (this.y < bounds.y1) {
                this.y = bounds.y1;
                this.vy *= this.bounce;
            } else if (this.y > bounds.y2) {
                this.y = bounds.y2;
                this.vy *= this.bounce;
            }
        }
    };
    adc.particle = {
        _parent: {},
        init: function() {
            this.rx = this.ry = this._parent.r;
            this.spin = this._parent.spin;
            this.initialPoint = this._n * this.dfltAngle;
            this.sinAngles = [];
            this.cosAngles = [];
            do {
                this.spin += this.dfltAngle * this._parent.spinRate;
                this.cacheMath();
            }
            while (this.dfltAngle > this.spin);
            if (this.dfltAngle < this.spin) {
                this.spin -= this.dfltAngle;
                this.cacheMath();
            }
        },
        cacheMath: function() {
            var newPoint = this.initialPoint + this.spin;
            this.sinAngles.push(Math.sin(newPoint.toFixed(3)));
            this.cosAngles.push(Math.cos(newPoint.toFixed(3)));
        },
        burst: function() {
            this.rx += this.vx;
            this.ry += this.vy;
        },
        move: function() {
            this.x = (this._parent.x + this.cosAngles[this._parent.spin] * this.rx) | 0;
            this.y = (this._parent.y + this.sinAngles[this._parent.spin] * this.ry) | 0;
        },
        intersect: function(point) {
            var xs = this.x - point.x;
            var ys = this.y - point.y;
            xs *= xs;
            ys *= ys;
            return this.r + point.r > Math.sqrt(xs + ys);
        },
        drawDecay: function() {
            var alpha = this._parent.decayDuration / 20;
            this.radial1 = 'rgba(255,160,160,' + alpha + ')';
            this.radial2 = 'rgba(120,0,0,' + alpha + ')';
        },
        drawBust: function() {
            // light red
            this.radial1 = 'rgb(255,240,240)';
            // red
            this.radial2 = 'rgb(120,0,0)';
        },
        drawFloat: function() {
            // light blue
            this.radial1 = 'rgb(135,206,235)';
            // blue
            this.radial2 = 'rgb(50,100,120)';
        },
        render: function() {
            // create radial gradient
            var grd = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
            context.beginPath();
            grd.addColorStop(0, this.radial1);
            grd.addColorStop(1, this.radial2);
            context.arc(this.x, this.y, this.r, 0, adc.cash.pi2, true);
            context.fillStyle = grd;
            context.fill();
        }
    };
    adc.particleGroup = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        spin: 0,
        spinRate: 0.02,
        decayDuration: 20,
        burstDuration: 120,
        init: function() {
            var i = 1,
                particle;
            this.particles = [];
            this.x = Math.random() * bounds.x2;
            this.y = Math.random() * bounds.y2;
            this.vx = (Math.random() * 1 - adc.particleSystem.speed) * this.unit / 10;
            this.vy = (Math.random() * 1 - adc.particleSystem.speed) * this.unit / 10;
            for (i; i <= particlesNumber; ++i) {
                particle = Object.create(adc.particle);
                particle._n = i;
                particle._parent = this;
                this.particles.push(particle);
                particle.init();
            }
            this.spinCycleLength = Math.ceil(1 / this.spinRate);
        },
        burst: function() {
            var particle,
                i = this.particles.length;
            while (i--) {
                particle = this.particles[i];
                particle.burst();
                particle.move();
                particle.hitTestWall();
            }
            this.burstDuration--;
        },
        move: function() {
            this.x += this.vx;
            this.y += this.vy;
        },
        rotate: function() {
            this.spin = this.spinCycleLength > this.spin ? this.spin + 1 : 0;
        },
        update: function() {
            var particle,
                i = this.particles.length;
            while (i--) {
                particle = this.particles[i];
                particle.move();
            }
        },
        drawDecay: function() {
            var particle,
                i = this.particles.length;
            context.shadowBlur = 5 * this.r + particlesNumber - this.decayDuration * this.r / 10;
            while (i--) {
                particle = this.particles[i];
                particle.drawDecay();
                particle.render();
            }
        },
        drawBust: function() {
            var particle,
                i = this.particles.length;
            while (i--) {
                particle = this.particles[i];
                particle.drawBust();
                particle.render();
            }
        },
        drawFloat: function() {
            var particle,
                i = this.particles.length;
            while (i--) {
                particle = this.particles[i];
                particle.drawFloat();
                particle.render();
            }
        }
    };
    adc.particleSystem = {
        speed: 1.2,
        addGroup: function(particleGroup) {
            this.floatGroups.push(particleGroup);
        },
        resetGroups: function() {
            this.decayGroups = [];
            this.burstGroups = [];
            this.floatGroups = [];
        },
        hitTest: function() {
            var burstGroup,
                burstParticle,
                particleGroup,
                particle,
                i,
                ii,
                iii,
                iiii;
            if (!this.burstGroups.length) {
                return;
            }
            i = this.burstGroups.length;
            // when we have just a couple of object moving around the screen, it is
            // pretty much straight forward to detect collision between them.
            while (i--) {
                burstGroup = this.burstGroups[i].particles;
                ii = burstGroup.length;
                particleLabel:
                    while (ii--) {
                        burstParticle = burstGroup[ii];
                        iii = this.floatGroups.length;
                        while (iii--) {
                            particleGroup = this.floatGroups[iii].particles;
                            iiii = particleGroup.length;
                            while (iiii--) {
                                particle = particleGroup[iiii];
                                // checks whether a particle from the exploding group
                                // collides with a particle from the any other group
                                if (burstParticle.intersect(particle)) {
                                    // removes the particle which caused the collision
                                    burstGroup.splice(ii, 1);
                                    // the group of particles bursts
                                    this.burstGroups.push(this.floatGroups.splice(iii, 1)[0]);
                                    GameUI.setScore(1);
                                    GameUI.setMolecules(1);
                                    GameUI.playAudio("split" + Math.ceil(Math.random() * 5));
                                    break particleLabel;
                                }
                            }
                        }
                    }
            }

            if (pointer) {
                // this indicates that we have tapped over an object
                if (this.burstGroups.length > 1) {
                    GameUI.setLives(-1);
                    chainReaction = 1;
                }
                this.burstGroups.shift();
                pointer = null;
            }
        },
        update: function() {
            var group,
                i = this.decayGroups.length;

            if (chainReaction) {
                if (numGroups - this.floatGroups.length >= minGroups && !passed) {
                    passed = 1;
                    GameUI.playAudio("win");
                }
                if (this.burstGroups.length + i === 0) {
                    if (passed) {
                        if (this.floatGroups.length) {
                            GameUI.setLives(1);
                        } else {
                            GameUI.setLives(2);
                            GameUI.showExcellent();
                        }
                        GameUI.setLevel(1);
                    } else {
                        GameUI.lives ? GameUI.showFail() : GameUI.showEnd();
                    }
                    GameEngine.resetFrame();
                    GameUI.showNext();
                    return;
                }
            }

            while (i--) {
                group = this.decayGroups[i];
                group.decayDuration--;
                if (!group.decayDuration) {
                    this.decayGroups.splice(i, 1);
                }
            }
            i = this.burstGroups.length;
            while (i--) {
                group = this.burstGroups[i];
                group.burst();
                if (!group.burstDuration) {
                    this.decayGroups.push(this.burstGroups.splice(i, 1)[0]);
                }
            }
            i = this.floatGroups.length;
            while (i--) {
                group = this.floatGroups[i];
                group.move();
                group.rotate();
                group.hitTestWall();
                group.update();
            }
        },
        render: function() {
            var i = this.decayGroups.length;
            while (i--) {
                this.decayGroups[i].drawDecay();
            }
            context.shadowBlur = adc.particleBase.unit;
            i = this.burstGroups.length;
            while (i--) {
                this.burstGroups[i].drawBust();
            }
            i = this.floatGroups.length;
            while (i--) {
                this.floatGroups[i].drawFloat();
            }
        }
    };

    var animate = function() {
        context.clearRect(bounds.x1, bounds.y1, bounds.x2, bounds.y2);
        system.hitTest();
        system.update();
        system.render();
    };

    var enterFrame = function() {
        fps = setInterval(animate, 1000 / 60);
    };

    var resetFrame = function() {
        clearInterval(fps);
    };

    var tap = function(e) {
        if (GameUI.lives && !chainReaction) {
            system.burstGroups.push(
                pointer = {
                    particles: [{
                        x: e.clientX || e.touches[0].clientX,
                        y: e.clientY || e.touches[0].clientY,
                        r: adc.cash.customR[particlesNumber - 2] * adc.particleBase.unit / 10,
                        intersect: adc.particle.intersect
                    }]
                }
            );
        }
        e.stopPropagation();
    };

    var extend = function(obj, props) {
        var prop;
        for (prop in props) {
            if (props.hasOwnProperty(prop)) {
                obj[prop] = props[prop];
            }
        }
    };

    var initSystem = function() {
        var unit, vxy;

        particlesNumber = levels[GameUI.level][0];
        minGroups = levels[GameUI.level][1];
        numGroups = levels[GameUI.level][2];

        GameUI.initialised = 1;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        unit = Math.ceil(Math.sqrt(canvas.width * canvas.height) / 80);

        bounds = {
            x1: 0,
            y1: 0,
            x2: canvas.width,
            y2: canvas.height
        };

        extend(
            adc.particleBase, {
                unit: unit,
                dfltAngle: adc.cash.pi2 / particlesNumber,
                context: context
            }
        );
        extend(adc.particle, adc.particleBase);
        vxy = unit / 5 * adc.particleSystem.speed;
        extend(adc.particle, {
            r: unit,
            vx: vxy,
            vy: vxy,
        });
        extend(adc.particleGroup, adc.particleBase);
        extend(adc.particleGroup, {
            r: unit + adc.cash.customR[particlesNumber - 2] * unit / 10
        });

        system = Object.create(adc.particleSystem);
        resetSystem();
        
        context.shadowColor = 'white';
    };

    var initfloatGroups = function() {
        var i,
            particleGroup;
        for (i = 0; i < numGroups; i += 1) {
            particleGroup = Object.create(adc.particleGroup);
            particleGroup.init();
            system.addGroup(particleGroup);
        }
    };

    var initStage = function() {
        initSystem();
        initfloatGroups();
    };

    var resetSystem = function() {
        chainReaction = 0;
        passed = 0;
        adc.particleSystem.resetGroups();
        context.clearRect(bounds.x1, bounds.y1, bounds.x2, bounds.y2);
    };

    canvas.addEventListener(GameUI.evt.down, tap, false);

    return {
        "initStage": initStage,
        "enterFrame": enterFrame,
        "resetSystem": resetSystem,
        "resetFrame": resetFrame
    };
};