// オーバーレイ表示の管理（移動・拡大縮小・回転機能付き）
class OverlayRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.referenceImage = null;
        this.imageElement = null;
        this.opacity = 0.5;
        this.animationFrameId = null;

        // 変形パラメータ
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1.0;
        this.rotation = 0; // ラジアン

        // タッチ操作用
        this.isDragging = false;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.lastTouchDistance = 0;

        // イベントリスナーをバインド
        this.setupEventListeners();
    }

    setupEventListeners() {
        // タッチイベント（モバイル）
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // マウスイベント（デスクトップ）
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    // タッチイベント処理
    handleTouchStart(e) {
        e.preventDefault();
        const touches = e.touches;

        if (touches.length === 1) {
            // 1本指: ドラッグ開始
            this.isDragging = true;
            this.lastTouchX = touches[0].clientX;
            this.lastTouchY = touches[0].clientY;
        } else if (touches.length === 2) {
            // 2本指: ピンチ開始
            this.isDragging = false;
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touches = e.touches;

        if (touches.length === 1 && this.isDragging) {
            // ドラッグ: 位置を移動
            const deltaX = touches[0].clientX - this.lastTouchX;
            const deltaY = touches[0].clientY - this.lastTouchY;

            this.offsetX += deltaX;
            this.offsetY += deltaY;

            this.lastTouchX = touches[0].clientX;
            this.lastTouchY = touches[0].clientY;
        } else if (touches.length === 2) {
            // ピンチ: 拡大縮小
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.lastTouchDistance > 0) {
                const scaleDelta = distance / this.lastTouchDistance;
                this.scale = Math.max(0.1, Math.min(5.0, this.scale * scaleDelta));
            }

            this.lastTouchDistance = distance;
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (e.touches.length === 0) {
            this.isDragging = false;
            this.lastTouchDistance = 0;
        }
    }

    // マウスイベント処理
    handleMouseDown(e) {
        this.isDragging = true;
        this.lastTouchX = e.clientX;
        this.lastTouchY = e.clientY;
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const deltaX = e.clientX - this.lastTouchX;
        const deltaY = e.clientY - this.lastTouchY;

        this.offsetX += deltaX;
        this.offsetY += deltaY;

        this.lastTouchX = e.clientX;
        this.lastTouchY = e.clientY;
    }

    handleMouseUp(e) {
        this.isDragging = false;
    }

    // 公開メソッド: 拡大縮小
    adjustScale(delta) {
        this.scale = Math.max(0.1, Math.min(5.0, this.scale + delta));
    }

    // 公開メソッド: 回転
    rotate(angleDegrees) {
        this.rotation += (angleDegrees * Math.PI) / 180;
    }

    // 公開メソッド: リセット
    resetTransform() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1.0;
        this.rotation = 0;
    }

    setReferenceImage(imageDataUrl) {
        this.referenceImage = imageDataUrl;
        this.imageElement = new Image();
        this.imageElement.src = imageDataUrl;

        return new Promise((resolve, reject) => {
            this.imageElement.onload = () => resolve();
            this.imageElement.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        });
    }

    setOpacity(opacity) {
        this.opacity = opacity;
    }

    startRendering(videoElement) {
        // キャンバスサイズをビデオに合わせる
        const resizeCanvas = () => {
            if (videoElement.videoWidth > 0) {
                this.canvas.width = videoElement.videoWidth;
                this.canvas.height = videoElement.videoHeight;
            }
        };

        resizeCanvas();
        videoElement.addEventListener('loadedmetadata', resizeCanvas);

        const render = () => {
            if (this.referenceImage && this.imageElement && this.imageElement.complete) {
                this.renderOverlay();
            }
            this.animationFrameId = requestAnimationFrame(render);
        };

        render();
    }

    renderOverlay() {
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.imageElement || !this.imageElement.complete) return;

        this.ctx.save();
        this.ctx.globalAlpha = this.opacity;

        // キャンバスの中心を基準に変形
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 変形を適用
        this.ctx.translate(centerX + this.offsetX, centerY + this.offsetY);
        this.ctx.rotate(this.rotation);
        this.ctx.scale(this.scale, this.scale);

        // アスペクト比を保持して描画（contain方式: 画像全体が見える）
        const imgAspect = this.imageElement.width / this.imageElement.height;
        const canvasAspect = this.canvas.width / this.canvas.height;

        let drawWidth, drawHeight;

        if (imgAspect > canvasAspect) {
            // 画像が横長: 幅を基準に
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imgAspect;
        } else {
            // 画像が縦長: 高さを基準に
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imgAspect;
        }

        // 中心に配置（translate済みなので、中心からの相対位置）
        this.ctx.drawImage(
            this.imageElement,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );

        this.ctx.restore();
    }

    stopRendering() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    clearOverlay() {
        this.referenceImage = null;
        this.imageElement = null;
        this.resetTransform();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
