import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const { width, height } = this.scale;

        // --- Score panel (top-left) ---
        this.scoreBg = this.add.graphics();
        this.scoreBg.fillStyle(0x000000, 0.35);
        this.scoreBg.fillRoundedRect(16, 16, 200, 56, 16);

        this.scoreIcon = this.add.text(32, 26, '🍎', {
            fontSize: '32px',
        });

        this.scoreText = this.add.text(72, 28, '0', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });

        // --- Super mode banner ---
        this.superBanner = this.add.text(width / 2, 100, 'БІЛЬШЕ ФРУКТІВ!!', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '52px',
            fontStyle: 'bold',
            color: '#ffdd00',
            stroke: '#ff8800',
            strokeThickness: 6,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 8,
                fill: true,
            },
        }).setOrigin(0.5).setAlpha(0).setDepth(50);

        // --- Super mode timer ---
        this.superTimerText = this.add.text(width / 2, 160, '', {
            fontFamily: '"Segoe UI", Arial, sans-serif',
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0).setDepth(50);

        // --- Listen to game events ---
        const gameScene = this.scene.get('GameScene');

        gameScene.events.on('scoreChanged', (score) => {
            this.scoreText.setText(score.toString());
            // Punch animation on score change
            this.tweens.killTweensOf(this.scoreText);
            this.scoreText.setScale(1.3);
            this.tweens.add({
                targets: this.scoreText,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Back.easeOut',
            });
        });

        gameScene.events.on('superMode', (active, duration) => {
            if (active) {
                this.superBanner.setAlpha(1);
                this.superTimerText.setAlpha(1);

                // Zoom in/out animation
                this.tweens.add({
                    targets: this.superBanner,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });

                // Rainbow color cycle
                this.superColorTimer = this.time.addEvent({
                    delay: 200,
                    callback: () => {
                        const colors = ['#ffdd00', '#ff6644', '#ff44aa', '#44ddff', '#88ff44'];
                        this.superBanner.setColor(Phaser.Math.RND.pick(colors));
                    },
                    loop: true,
                });

                // Timer update
                this.currentSuperDuration = duration || 5000;
                this.superTimerEvent = this.time.addEvent({
                    delay: 100,
                    callback: () => {
                        this.currentSuperDuration -= 100;
                        if (this.currentSuperDuration < 0) this.currentSuperDuration = 0;
                        const seconds = Math.ceil(this.currentSuperDuration / 1000);
                        this.superTimerText.setText(seconds.toString());
                    },
                    loop: true,
                });
                this.superTimerText.setText(Math.ceil(this.currentSuperDuration / 1000).toString());

            } else {
                this.tweens.killTweensOf(this.superBanner);
                this.superBanner.setAlpha(0).setScale(1);
                this.superTimerText.setAlpha(0);

                if (this.superColorTimer) {
                    this.superColorTimer.remove();
                    this.superColorTimer = null;
                }
                if (this.superTimerEvent) {
                    this.superTimerEvent.remove();
                    this.superTimerEvent = null;
                }
            }
        });

        gameScene.events.on('gameWin', () => {
            // Stop super mode effects if valid
            this.tweens.killTweensOf(this.superBanner);
            this.superBanner.setAlpha(0);
            this.superTimerText.setAlpha(0);

            // Darken background
            const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
            overlay.setDepth(100);
            overlay.setAlpha(0);
            this.tweens.add({
                targets: overlay,
                alpha: 1,
                duration: 500
            });

            // Win Text
            const winText = this.add.text(width / 2, height / 2 - 50, "Вітаю!\nВи отримали значок\n\"Сила Швидкості!\"", {
                fontFamily: '"Segoe UI", Arial, sans-serif',
                fontSize: '48px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 6,
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: '#000000',
                    blur: 8,
                    fill: true,
                },
            }).setOrigin(0.5).setDepth(101).setScale(0);

            this.tweens.add({
                targets: winText,
                scaleX: 1,
                scaleY: 1,
                duration: 800,
                ease: 'Back.easeOut'
            });

            // Confetti effect (simple particles)
            for (let i = 0; i < 50; i++) {
                const p = this.add.circle(width / 2, height / 2, 8, 0xffffff);
                p.setDepth(102);
                p.setFillStyle(Phaser.Math.RND.pick([0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]));
                this.tweens.add({
                    targets: p,
                    x: Phaser.Math.Between(0, width),
                    y: Phaser.Math.Between(0, height),
                    alpha: 0,
                    duration: Phaser.Math.Between(1000, 2000),
                    ease: 'Sine.easeOut'
                });
            }
        });
    }
}
