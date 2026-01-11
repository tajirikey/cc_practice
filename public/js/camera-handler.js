// カメラの制御とキャプチャ
class CameraHandler {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.stream = null;
        this.facingMode = 'environment'; // 背面カメラ
    }

    async checkCameraSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('お使いのブラウザはカメラ機能に対応していません');
        }

        // HTTPS要件のチェック（localhostは除く）
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            throw new Error('カメラを使用するにはHTTPS環境が必要です');
        }
    }

    async startCamera() {
        try {
            await this.checkCameraSupport();

            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;

            return new Promise((resolve) => {
                this.videoElement.addEventListener('loadedmetadata', () => {
                    resolve();
                }, { once: true });
            });
        } catch (error) {
            console.error('カメラアクセスエラー:', error);

            if (error.name === 'NotAllowedError') {
                throw new Error('カメラの使用が許可されていません。ブラウザの設定を確認してください。');
            } else if (error.name === 'NotFoundError') {
                throw new Error('カメラが見つかりません');
            } else {
                throw error;
            }
        }
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        this.stopCamera();
        await this.startCamera();
    }

    capturePhoto() {
        const canvas = document.createElement('canvas');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0);

        return canvas.toDataURL('image/jpeg', 0.9);
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.videoElement.srcObject = null;
        }
    }

    getVideoElement() {
        return this.videoElement;
    }
}
