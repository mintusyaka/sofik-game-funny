import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const { width, height } = this.scale;
        const barW = width * 0.6;
        const barH = 30;
        const barX = (width - barW) / 2;
        const barY = height / 2;

        const bg = this.add.rectangle(width / 2, barY, barW, barH, 0x444444).setOrigin(0.5);
        const fill = this.add.rectangle(barX, barY - barH / 2, 0, barH, 0xaa55ff).setOrigin(0, 0);

        this.load.on('progress', (p) => {
            fill.width = barW * p;
        });

        this.load.on('complete', () => {
            bg.destroy();
            fill.destroy();
        });



        // Try to load custom player asset (won't crash if missing, checks in GameScene)
        this.load.image('custom_player', 'assets/player.png');

        // Generate all textures procedurally (no external assets needed)
        this.generateTextures();
    }

    generateTextures() {
        const g = this.make.graphics({ add: false });

        // --- Player (cute round character) ---
        g.clear();
        // Body
        g.fillStyle(0xff6b9d, 1);
        g.fillCircle(32, 32, 28);
        // Eyes
        g.fillStyle(0xffffff, 1);
        g.fillCircle(22, 26, 8);
        g.fillCircle(42, 26, 8);
        g.fillStyle(0x222222, 1);
        g.fillCircle(24, 26, 4);
        g.fillCircle(44, 26, 4);
        // Smile
        g.lineStyle(2, 0x222222, 1);
        g.beginPath();
        g.arc(32, 34, 10, 0.2, Math.PI - 0.2, false);
        g.strokePath();
        g.generateTexture('player', 64, 64);

        // --- Apple (fruit) ---
        g.clear();
        g.fillStyle(0xff4444, 1);
        g.fillCircle(20, 24, 16);
        g.fillStyle(0x44aa22, 1);
        g.fillRect(18, 4, 4, 10);
        g.fillStyle(0x33881a, 1);
        g.fillEllipse(26, 8, 10, 6);
        g.generateTexture('apple', 40, 40);

        // --- Banana (fruit) ---
        g.clear();
        g.fillStyle(0xffdd44, 1);
        g.beginPath();
        g.arc(20, 30, 16, -0.8, Math.PI + 0.2, false);
        g.lineTo(8, 14);
        g.closePath();
        g.fillPath();
        g.fillStyle(0xccaa22, 1);
        g.fillRect(18, 4, 4, 8);
        g.generateTexture('banana', 40, 44);

        // --- Cherry (fruit) ---
        g.clear();
        g.fillStyle(0xcc2244, 1);
        g.fillCircle(12, 28, 10);
        g.fillCircle(28, 28, 10);
        g.lineStyle(2, 0x33881a, 1);
        g.beginPath();
        g.moveTo(12, 18);
        g.lineTo(20, 4);
        g.lineTo(28, 18);
        g.strokePath();
        g.generateTexture('cherry', 40, 40);

        // --- Grape (fruit) ---
        g.clear();
        g.fillStyle(0x8844cc, 1);
        g.fillCircle(16, 20, 7);
        g.fillCircle(28, 20, 7);
        g.fillCircle(10, 30, 7);
        g.fillCircle(22, 30, 7);
        g.fillCircle(34, 30, 7);
        g.fillCircle(16, 38, 7);
        g.fillCircle(28, 38, 7);
        g.fillStyle(0x33881a, 1);
        g.fillRect(20, 4, 4, 12);
        g.generateTexture('grape', 44, 48);

        // --- Bad item: Bomb ---
        g.clear();
        g.fillStyle(0x333333, 1);
        g.fillCircle(20, 24, 16);
        g.fillStyle(0x555555, 1);
        g.fillCircle(14, 18, 4);
        g.fillStyle(0xffaa00, 1);
        g.fillRect(18, 2, 4, 10);
        // Spark
        g.fillStyle(0xff4400, 1);
        g.fillCircle(20, 2, 5);
        g.fillStyle(0xffdd00, 1);
        g.fillCircle(20, 2, 3);
        g.generateTexture('bomb', 40, 40);

        // --- Bad item: Skull ---
        g.clear();
        g.fillStyle(0xcccccc, 1);
        g.fillCircle(20, 20, 16);
        g.fillStyle(0x222222, 1);
        g.fillCircle(14, 18, 5);
        g.fillCircle(26, 18, 5);
        g.fillRect(14, 28, 12, 3);
        g.fillRect(16, 31, 2, 3);
        g.fillRect(22, 31, 2, 3);
        g.generateTexture('skull', 40, 40);

        // --- SUPER item: Star ---
        g.clear();
        g.fillStyle(0xffdd00, 1);
        const cx = 24, cy = 24, outerR = 22, innerR = 10;
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        // Inner glow
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(cx, cy, 6);
        g.generateTexture('star', 48, 48);

        // --- Particle (small circle for effects) ---
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle', 8, 8);

        // --- Sparkle ---
        g.clear();
        g.fillStyle(0xffff88, 1);
        const sCx = 8, sCy = 8, sOuterR = 8, sInnerR = 4;
        g.beginPath();
        for (let i = 0; i < 4 * 2; i++) {
            const r = (i % 2 === 0) ? sOuterR : sInnerR;
            // -Pi/2 to start at top
            const a = (Math.PI * i / 4) - Math.PI / 2;
            const x = sCx + Math.cos(a) * r;
            const y = sCy + Math.sin(a) * r;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.closePath();
        g.fillPath();
        g.generateTexture('sparkle', 16, 16);

        g.destroy();
    }

    create() {
        this.scene.start('GameScene');
        this.scene.start('UIScene');
    }
}
