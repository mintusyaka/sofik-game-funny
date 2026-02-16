import Phaser from 'phaser';

const FRUITS = ['apple', 'banana', 'cherry', 'grape'];
const BAD_ITEMS = ['bomb', 'skull'];

const ITEM_POINTS = {
    bomb: -20,
    skull: -15,
    star: 0, // triggers SUPER mode
};

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.scale;

        this.score = 0;
        this.superMode = false;
        this.superTimer = null;
        this.spawnTimer = null;
        this.items = [];

        // --- Background gradient ---
        this.createBackground(width, height);

        // --- Player ---
        // Use custom asset if loaded and valid (width > 0 check handles failed loads/missing texture placeholders)
        let playerKey = 'player';
        if (this.textures.exists('custom_player')) {
            const tex = this.textures.get('custom_player');
            // Check if it's the missing texture placeholder (key '__MISSING')
            if (tex.key !== '__MISSING') {
                playerKey = 'custom_player';
            }
        }

        this.player = this.physics.add.sprite(width / 2, height - 120, playerKey);

        // Scale player to a reasonable size (target width ~100px)
        const targetWidth = 100;
        const scaleFactor = targetWidth / this.player.width;
        this.player.setScale(scaleFactor);

        // Adjust physics body to match visual circle
        const radius = (this.player.width * 0.4); // slightly smaller than full width
        this.player.setCircle(radius, this.player.width * 0.1, this.player.height * 0.1);

        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);

        // Breathing animation for player (relative to calculated scale)
        this.tweens.add({
            targets: this.player,
            scaleX: '*=1.05', // scale up 5% (relative)
            scaleY: '*=0.95', // squash down 5% (relative)
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // --- Input: follow pointer / finger ---
        this.input.on('pointermove', (pointer) => {
            this.targetX = pointer.x;
            this.targetY = pointer.y;
        });

        this.input.on('pointerdown', (pointer) => {
            this.targetX = pointer.x;
            this.targetY = pointer.y;
            this.isPointerDown = true;
        });

        this.input.on('pointerup', () => {
            this.isPointerDown = false;
        });

        this.targetX = width / 2;
        this.targetY = height - 120;
        this.isPointerDown = false;

        // --- Item group ---
        this.itemGroup = this.physics.add.group();

        // --- Overlap: player <-> items ---
        this.physics.add.overlap(this.player, this.itemGroup, this.collectItem, null, this);

        // --- Spawn timer ---
        this.currentSpawnDelay = 1200;
        this.badItemChance = 0.25;
        this.itemLifetime = 6000;

        this.spawnTimer = this.time.addEvent({
            delay: this.currentSpawnDelay,
            callback: this.spawnItem,
            callbackScope: this,
            loop: true,
        });

        // --- Ground line decoration ---
        const groundLine = this.add.rectangle(width / 2, height - 40, width, 4, 0xffffff, 0.12);

        // --- Floating particles background ---
        this.createFloatingParticles(width, height);

        // Emit ready event for UI
        this.events.emit('scoreChanged', this.score);
    }

    createBackground(w, h) {
        // Layered gradient background
        const bg = this.add.graphics();
        const colors = [0x1a0a2e, 0x2d1b69, 0x4a2c8a, 0x6b3fa0];
        const step = h / colors.length;
        for (let i = 0; i < colors.length; i++) {
            bg.fillStyle(colors[i], 1);
            bg.fillRect(0, i * step, w, step + 2);
        }
        bg.setDepth(-10);

        // Decorative circles
        for (let i = 0; i < 5; i++) {
            const circle = this.add.circle(
                Phaser.Math.Between(50, w - 50),
                Phaser.Math.Between(50, h - 200),
                Phaser.Math.Between(30, 80),
                0xffffff,
                Phaser.Math.FloatBetween(0.02, 0.06)
            );
            circle.setDepth(-5);
            this.tweens.add({
                targets: circle,
                y: circle.y + Phaser.Math.Between(-30, 30),
                alpha: circle.alpha * 1.5,
                duration: Phaser.Math.Between(3000, 6000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
    }

    createFloatingParticles(w, h) {
        for (let i = 0; i < 12; i++) {
            const p = this.add.image(
                Phaser.Math.Between(0, w),
                Phaser.Math.Between(0, h),
                'particle'
            );
            p.setAlpha(Phaser.Math.FloatBetween(0.05, 0.15));
            p.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
            p.setDepth(-3);

            this.tweens.add({
                targets: p,
                y: p.y - Phaser.Math.Between(60, 150),
                x: p.x + Phaser.Math.Between(-40, 40),
                alpha: 0,
                duration: Phaser.Math.Between(4000, 8000),
                repeat: -1,
                onRepeat: () => {
                    p.x = Phaser.Math.Between(0, w);
                    p.y = Phaser.Math.Between(h * 0.5, h);
                    p.alpha = Phaser.Math.FloatBetween(0.05, 0.15);
                },
            });
        }
    }

    update(time, delta) {
        // Smooth follow for player
        const speed = 8;
        const dx = this.targetX - this.player.x;
        const dy = this.targetY - this.player.y;

        this.player.x += dx * speed * (delta / 1000);
        this.player.y += dy * speed * (delta / 1000);

        // Clamp player within game bounds
        const { width, height } = this.scale;
        this.player.x = Phaser.Math.Clamp(this.player.x, 32, width - 32);
        this.player.y = Phaser.Math.Clamp(this.player.y, 32, height - 32);

        // Remove off-screen items
        this.itemGroup.getChildren().forEach((item) => {
            if (item.y > height + 60 || item.y < -60 || item.x < -60 || item.x > width + 60) {
                this.removeItem(item);
            }
        });
    }

    spawnItem() {
        const { width, height } = this.scale;

        let type;
        if (this.superMode) {
            // In super mode, spawn mostly fruits
            type = Phaser.Math.RND.pick([...FRUITS, ...FRUITS, ...FRUITS, FRUITS[0]]);
        } else {
            // Dynamic difficulty chances
            const roll = Math.random();
            const fruitChance = 0.85 - this.badItemChance; // e.g. 0.60 -> 0.35

            if (roll < fruitChance) {
                type = Phaser.Math.RND.pick(FRUITS);
            } else if (roll < 0.85) {
                type = Phaser.Math.RND.pick(BAD_ITEMS);
            } else {
                type = 'star';
            }
        }

        // Random position within play area
        const x = Phaser.Math.Between(50, width - 50);
        const y = Phaser.Math.Between(100, height - 200);

        const item = this.physics.add.sprite(x, y, type);
        item.setScale(1.4);
        item.setScale(1.4);
        item.setDepth(5);
        item.setData('type', type);
        // Points for bad items are fixed; fruits are calculated on collection
        if (BAD_ITEMS.includes(type)) {
            item.setData('points', ITEM_POINTS[type]);
        }
        item.setData('spawnTime', this.time.now);

        this.itemGroup.add(item);

        // Spawn-in pop animation
        item.setScale(0);
        this.tweens.add({
            targets: item,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 300,
            ease: 'Back.easeOut',
        });

        // Wobble animation
        this.tweens.add({
            targets: item,
            angle: Phaser.Math.Between(-12, 12),
            duration: Phaser.Math.Between(400, 800),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Gentle float up/down
        this.tweens.add({
            targets: item,
            y: item.y + Phaser.Math.Between(-15, 15),
            duration: Phaser.Math.Between(1000, 2000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Star special glow pulse
        if (type === 'star') {
            item.setScale(0);
            this.tweens.add({
                targets: item,
                scaleX: 1.8,
                scaleY: 1.8,
                duration: 500,
                ease: 'Back.easeOut',
            });
            this.tweens.add({
                targets: item,
                alpha: 0.6,
                duration: 300,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // Auto-despawn after dynamic lifetime
        this.time.delayedCall(this.itemLifetime, () => {
            if (item && item.active) {
                this.tweens.add({
                    targets: item,
                    alpha: 0,
                    scaleX: 0,
                    scaleY: 0,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => this.removeItem(item),
                });
            }
        });
    }

    collectItem(player, item) {
        if (!item.active) return;

        const type = item.getData('type');
        let points = item.getData('points');
        const spawnTime = item.getData('spawnTime');
        let bonusText = '';

        if (type === 'star') {
            this.activateSuperMode();
        } else if (BAD_ITEMS.includes(type)) {
            // Bad items have fixed negative points
            points = item.getData('points');
        } else {
            // FRUITS: Speed-based scoring (Reaction Time)
            if (spawnTime) {
                const elapsed = this.time.now - spawnTime;

                if (elapsed < 500) {
                    points = 50;
                    bonusText = ' БОЖЕСТВЕННО!';
                } else if (elapsed < 1000) {
                    points = 25;
                    bonusText = ' ЧУДОВО!';
                } else if (elapsed < 2000) {
                    points = 10;
                    bonusText = ' ДОБРЕ';
                } else {
                    points = 5;
                    bonusText = '';
                }
            } else {
                points = 5; // Fallback
            }
        }

        if (type !== 'star') {
            this.score += points;
            if (this.score < 0) this.score = 0;

            this.updateDifficulty();

            this.events.emit('scoreChanged', this.score);

            if (this.score >= 300) {
                this.triggerWin();
            }
        }

        // Collection effect
        this.spawnCollectEffect(item.x, item.y, type);

        // Show floating points text
        this.showPointsPopup(item.x, item.y - 30, points, type, bonusText);

        this.removeItem(item);
    }

    activateSuperMode() {
        if (this.superMode) {
            // Extend duration if already active
            if (this.superEndEvent) this.superEndEvent.remove();
        }

        this.superMode = true;
        this.events.emit('superMode', true, 5000);

        // Speed up spawning
        if (this.spawnTimer) this.spawnTimer.remove();
        this.spawnTimer = this.time.addEvent({
            delay: 400,
            callback: this.spawnItem,
            callbackScope: this,
            loop: true,
        });

        // Screen flash
        const { width, height } = this.scale;
        const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffdd00, 0.4);
        flash.setDepth(100);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 600,
            onComplete: () => flash.destroy(),
        });

        // End super mode after 5 seconds
        this.superEndEvent = this.time.delayedCall(5000, () => {
            this.superMode = false;
            this.events.emit('superMode', false);

            // Restore normal spawn rate (dynamic)
            if (this.spawnTimer) this.spawnTimer.remove();
            this.spawnTimer = this.time.addEvent({
                delay: this.currentSpawnDelay,
                callback: this.spawnItem,
                callbackScope: this,
                loop: true,
            });
        });
    }

    spawnCollectEffect(x, y, type) {
        const isBad = BAD_ITEMS.includes(type);
        const isStar = type === 'star';
        const color = isStar ? 0xffdd00 : isBad ? 0xff4444 : 0x44ff88;
        const count = isStar ? 16 : 8;

        for (let i = 0; i < count; i++) {
            const p = this.add.image(x, y, 'particle');
            p.setTint(color);
            p.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
            p.setDepth(15);

            const angle = (Math.PI * 2 * i) / count;
            const dist = Phaser.Math.Between(40, isStar ? 120 : 70);

            this.tweens.add({
                targets: p,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: Phaser.Math.Between(300, 600),
                ease: 'Power2',
                onComplete: () => p.destroy(),
            });
        }
    }

    showPointsPopup(x, y, points, type, bonus = '') {
        const isBad = BAD_ITEMS.includes(type);
        const isStar = type === 'star';

        let text = `${points}`;
        if (isStar) text = '⭐ СУПЕР!';
        else if (points > 0) text = `+${points}${bonus}`;

        const color = isStar ? '#ffdd00' : isBad ? '#ff5555' : '#55ff99';
        const fontSize = (points >= 50 || isStar) ? 36 : 28;

        const popup = this.add.text(x, y, text, {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: popup,
            y: y - 80,
            alpha: 0,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 800,
            ease: 'Power2',
            onComplete: () => popup.destroy(),
        });
    }

    removeItem(item) {
        if (item && item.active) {
            this.tweens.killTweensOf(item);
            this.itemGroup.remove(item, true, true);
        }
    }

    triggerWin() {
        // Stop spawning
        if (this.spawnTimer) this.spawnTimer.remove();
        if (this.superTimer) this.superTimer.remove();

        // Stop player movement
        this.input.off('pointermove');
        this.input.off('pointerdown');

        // Clear existing items
        this.itemGroup.clear(true, true);

        this.events.emit('gameWin');
    }

    updateDifficulty() {
        // LINEAR SCALING based on score (cap at 300)
        const progress = Math.min(this.score, 300);

        // Spawn Delay: 1200 -> 600
        this.currentSpawnDelay = 1200 - (progress * 2);
        this.currentSpawnDelay = Math.max(600, this.currentSpawnDelay);

        // Bad Item Chance: 0.25 -> 0.50
        this.badItemChance = 0.25 + (progress / 1200);
        this.badItemChance = Math.min(0.50, this.badItemChance);

        // Item Lifetime: 6000 -> 3000
        this.itemLifetime = 6000 - (progress * 10);
        this.itemLifetime = Math.max(3000, this.itemLifetime);

        // Update timer if not in super mode
        if (!this.superMode && this.spawnTimer) {
            this.spawnTimer.delay = this.currentSpawnDelay;
        }
    }
}
