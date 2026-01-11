// オーバーレイ表示の管理
class OverlayRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.referenceImage = null;
        this.imageElement = null;
        this.opacity = 0.5;
        this.animationFrameId = null;
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

        // アスペクト比を保持して描画
        const imgAspect = this.imageElement.width / this.imageElement.height;
        const canvasAspect = this.canvas.width / this.canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
            // 画像が横長
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imgAspect;
            offsetX = (this.canvas.width - drawWidth) / 2;
            offsetY = 0;
        } else {
            // 画像が縦長
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imgAspect;
            offsetX = 0;
            offsetY = (this.canvas.height - drawHeight) / 2;
        }

        this.ctx.drawImage(this.imageElement, offsetX, offsetY, drawWidth, drawHeight);
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
