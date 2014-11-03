var GameUI = {
    initialised: 0,
    level: 0,
    sound: 1,
    audioNodes: {},
    defaultLives: 2,
    lives: 0,
    score: 0,
    hiscore: 0,
    molecules: 0,
    paused: 0,
    finished: 0,
    historyApi: "history" in window && "pushState" in history,
    historyMap: {},
    evt: [{
        "down": "mousedown",
        "move": "mousemove",
        "up": "mouseup"
    }, {
        "down": "touchstart",
        "move": "touchmove",
        "up": "touchend"
    }]["ontouchstart" in window ? 1 : 0],

    eventRouter: {
        initGame: function() {
            GameUI.showElement("show-start");
            GameUI.clearNextLevelStats();
            GameUI.hideElement("show-end");
            if (GameUI.initialised) {
                GameUI.reset();
                GameEngine.resetSystem();
                this.restoreGame();
                return;
            }
            GameUI.$lives.textContent = GameUI.lives = GameUI.defaultLives;
            GameUI.setScore();
            GameUI.level = 0;
            GameUI.setLevel(1);
            GameUI.changeHash();
        },

        initNext: function() {
            GameEngine.initStage();
            GameUI.restoreStage();
        },

        refreshNext: function() {
            GameUI.hideElement("show-continue");
            GameEngine.resetSystem();
            GameUI.$next.addEventListener(GameUI.evt.up, GameUI.tap, false);
        },

        continueNext: function() {
            GameUI.restoreStage();
        },

        showStage: function() {
            GameUI.showElement("show-game");
            GameUI.showNext();
        },

        restoreGame: function() {
            if (GameUI.initialised){
                window.history.forward();
            } else {
                GameUI.changeHash();
            }
        },

        pauseGame: function() {
            window.history.back();
        },

        exitGameOver: function() {
            GameUI.hideElement("show-end show-next-level");
            window.history.back();
        },

        restoreMenu: function() {
            if (!GameUI.finished) {
                GameUI.showElement("show-continue");
            }
            GameUI.$sound.addEventListener("change", GameUI.toggleAudio, false);
            GameUI.$nav.addEventListener(GameUI.evt.up, GameUI.tap, false);
            GameUI.$pause.removeEventListener(GameUI.evt.up, GameUI.tap, false);
            GameUI.hideElement("show-game");
            GameEngine.resetFrame();
        }

    },

    restoreStage: function() {
        this.finished = 0;
        this.clearNextLevelStats();
        this.hideElement("show-start", "show-next-level");

        this.$sound.removeEventListener("change", GameUI.toggleAudio, false);
        this.$nav.removeEventListener(this.evt.up, this.tap, false);
        this.$next.removeEventListener(this.evt.up, this.tap, false);
        this.$pause.addEventListener(this.evt.up, this.tap, false);
        GameEngine.enterFrame();
    },

    clearNextLevelStats: function() {
        this.hideElement("show-continue", "show-fail", "show-excellent", "game-complete");
    },

    showFail: function() {
        this.showElement("show-fail");
    },

    showExcellent: function() {
        this.showElement("show-excellent");
    },

    showEnd: function() {
        level = 0;
        if (this.score > this.hiscore) {
            this.setHiscore(this.score);
        }
        this.showElement("show-end");
    },

    showNext: function() {
        this.finished = 1;
        this.$next.addEventListener(GameUI.evt.up, GameUI.tap, false);
        this.showElement("show-next-level");
        if (levels[GameUI.level]){
            this.setTarget();
        } else {
            this.showElement("show-complete");
        }  
    },

    changeHash: function(){
        this.eventRouter.showStage();
        if (this.historyApi) {
            history.pushState('showStage', "New Game", "#game");
        } else {
            location.hash = "#game";
        }
    },

    showElement: function(target) {
        if (this.$main.className.indexOf(target) === -1) {
            this.$main.className = this.$main.className + " " + target;
        }
    },

    hideElement: function() {
        var i = arguments.length;
        while (i--) {
            this.$main.className = this.$main.className.replace(" " + arguments[i], "");
        }
    },

    setLevel: function(n) {
        this.$level.textContent = this.level = n ? this.level + n : 0;
    },

    setLives: function(n) {
        this.$lives.textContent = this.lives = this.lives + n;
    },

    setScore: function(n) {
        this.$score.textContent = this.score = n ? this.score + n : 0;
    },

    setHiscore: function(n) {
        this.$hiscore.textContent = this.hiscore = n || 0;
    },

    setMolecules: function(n) {
        this.$molecules.textContent = this.molecules = n ? this.molecules + n : 0;
    },

    setMin: function(n) {
        var i = this.$min.length;
        while (i--) {
            this.$min[i].textContent = n;
        }
    },

    setMax: function(n) {
        this.$max.textContent = n;
    },

    setTarget: function() {
        this.setMolecules(0);
        this.setMin(levels[GameUI.level][1]);
        this.setMax(levels[GameUI.level][2]);
    },

    load: function() {
        var i,
            gameData = JSON.parse(localStorage.getItem("gameData"));
        for (i in gameData) {
            if (i in this) {
                this[i] = gameData[i];
            }
        }

    },

    save: function() {
        var gameData = {
            sound: GameUI.sound,
            hiscore: GameUI.hiscore
        };
        if (GameUI.lives && GameUI.level) {
            gameData.score = GameUI.score;
            gameData.lives = GameUI.lives;
            gameData.level = GameUI.level;
        }
        localStorage.setItem("gameData", JSON.stringify(gameData));
    },

    reset: function() {
        this.level = this.lives = 0;
        this.setLives(this.defaultLives);
        this.setScore();
        this.setLevel(1);
    },

    playAudio: function(j) {
        var audio = GameUI.audioNodes[j],
            uid,
            i = 10,
            newAudio;

        if (this.sound) {
            try {
                Android.playSnd(j, audio.loop.toString());
            } catch (err) {
                if (audio.currentTime) {
                    while (i--) {
                        uid = "$" + i + "#";
                        if (!(uid in GameUI.audioNodes)) {
                            GameUI.audioNodes[uid] = audio;
                            break;
                        }
                    }
                    if (!i) {
                        return;
                    }
                    newAudio = audio.cloneNode(true);
                    newAudio.id = uid;
                    audio.parentNode.insertBefore(newAudio, audio);
                    audio = newAudio;
                }
                audio.play();
                audio.addEventListener("ended", GameUI.endAudio, false);
            }
        }
    },

    endAudio: function() {
        if (this.id.indexOf("$") > -1) {
            delete GameUI.audioNodes[this.id];
            if (this.parentNode) {
                this.parentNode.removeChild(this);
                return;
            }
        }
        this.currentTime = 0;
        this.pause();
    },

    toggleAudio: function(e) {
        GameUI.sound = e.target.checked ? 0 : 1;
    },

    onPopState: function(e) {
        if (e.state && e.state in GameUI.eventRouter) {
            GameUI.eventRouter[e.state]();
        }
    },

    onRouteHash: function() {
        if (location.hash === "#game") {
            GameUI.eventRouter.showStage();
        } else {
            GameUI.eventRouter.restoreMenu();
        }
    },

    tap: function(e) {
        var fn,
            target = e.target;
        do {
            fn = target.getAttribute("data-fn");
            if (fn) {
                this.removeEventListener(GameUI.evt.up, GameUI.tap, false);
                GameUI.eventRouter[fn]();
                e.stopPropagation();
                return;
            }
            target = target.parentNode;
        }
        while (target != this);
    }

};

var ready = function() {
    var audios,
        audio,
        i;

    GameUI.load();

    GameUI.$nav = document.getElementById("game-nav");
    GameUI.$main = document.getElementById("main");
    GameUI.$sound = document.getElementById("sound");
    GameUI.$next = document.querySelector(".next-level");
    GameUI.$lives = document.querySelector(".lives > .number");
    GameUI.$pause = document.querySelector(".pause");
    GameUI.$level = document.querySelector(".level > .number");
    GameUI.$score = document.querySelector(".score > .number");
    GameUI.$hiscore = document.querySelector(".hiscore > .number");
    GameUI.$molecules = document.querySelector(".molecules > .number");
    GameUI.$min = document.querySelectorAll(".molecules-min");
    GameUI.$max = document.querySelector(".molecules > .max");

    audios = document.querySelectorAll("audio");
    i = audios.length;

    while (i--) {
        audio = audios[i];
        GameUI.audioNodes[audio.id] = audio;
    }

    GameUI.$level.textContent = GameUI.level;
    GameUI.$lives.textContent = GameUI.lives;
    GameUI.$score.textContent = GameUI.score;
    GameUI.$hiscore.textContent = GameUI.hiscore;
    GameUI.$sound.checked = !GameUI.sound;

    GameEngine = GameEngine();

    if (GameUI.historyApi) {
        window.addEventListener("popstate", GameUI.onPopState, false);
    } else {
        window.addEventListener("hashchange", GameUI.onRouteHash, false);
    }

    if (location.hash === "#game") {
        GameUI.eventRouter.showStage();
    } else {
        if (GameUI.historyApi) {
            history.replaceState('restoreMenu', "Game Menu", "");
        }
        if (GameUI.level) {
            GameUI.showElement("show-next-level");
        }
        GameUI.$sound.addEventListener("change", GameUI.toggleAudio, false);
        GameUI.$nav.addEventListener(GameUI.evt.up, GameUI.tap, false);
    }

    window.addEventListener("beforeunload", GameUI.save, false);
};

document.addEventListener("DOMContentLoaded", ready, false);