// メインアプリケーションロジック
class PhotoAlignmentApp {
    constructor() {
        this.storage = new StorageManager();
        this.cameraHandler = null;
        this.overlayRenderer = null;
        this.currentReferencePhotoId = null;

        // DOM要素
        this.homeView = document.getElementById('homeView');
        this.cameraView = document.getElementById('cameraView');
        this.photoGallery = document.getElementById('photoGallery');
        this.videoElement = document.getElementById('videoElement');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.modal = document.getElementById('photoSelectorModal');
        this.modalGallery = document.getElementById('photoSelectorGallery');

        this.init();
    }

    async init() {
        try {
            await this.storage.initDB();
            await this.loadPhotos();
            this.setupEventListeners();
        } catch (error) {
            console.error('初期化エラー:', error);
            alert('アプリの初期化に失敗しました: ' + error.message);
        }
    }

    setupEventListeners() {
        // ホーム画面のボタン
        document.getElementById('newPhotoBtn').addEventListener('click', () => {
            this.openCamera();
        });

        document.getElementById('alignPhotoBtn').addEventListener('click', () => {
            this.showPhotoSelector();
        });

        // カメラビューのボタン
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.capturePhoto();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeCamera();
        });

        document.getElementById('switchCameraBtn').addEventListener('click', async () => {
            try {
                await this.cameraHandler.switchCamera();
            } catch (error) {
                alert('カメラの切り替えに失敗しました: ' + error.message);
            }
        });

        // 透明度スライダー
        document.getElementById('opacitySlider').addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            document.getElementById('opacityValue').textContent = e.target.value;
            if (this.overlayRenderer) {
                this.overlayRenderer.setOpacity(opacity);
            }
        });

        // モーダル
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // モーダル外クリックで閉じる
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    async loadPhotos() {
        try {
            const photos = await this.storage.getPhotos();
            this.renderGallery(photos);
        } catch (error) {
            console.error('写真の読み込みエラー:', error);
        }
    }

    renderGallery(photos) {
        if (photos.length === 0) {
            this.photoGallery.innerHTML = '<p class="no-photos">まだ写真がありません</p>';
            return;
        }

        this.photoGallery.innerHTML = '';

        photos.forEach(photo => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            card.innerHTML = `
                <img src="${photo.data}" alt="${photo.description}">
                <div class="photo-info">
                    <p>${photo.description}</p>
                    <small>${this.formatDate(photo.timestamp)}</small>
                </div>
                <div class="photo-actions">
                    <button class="btn btn-small btn-use-ref" data-id="${photo.id}">参照に使う</button>
                    <button class="btn btn-small btn-delete" data-id="${photo.id}">削除</button>
                </div>
            `;

            // イベントリスナー
            card.querySelector('.btn-use-ref').addEventListener('click', () => {
                this.openCamera(photo.id);
            });

            card.querySelector('.btn-delete').addEventListener('click', async () => {
                if (confirm('この写真を削除しますか？')) {
                    await this.deletePhoto(photo.id);
                }
            });

            this.photoGallery.appendChild(card);
        });
    }

    async showPhotoSelector() {
        try {
            const photos = await this.storage.getPhotos();

            if (photos.length === 0) {
                alert('参照写真がありません。先に写真を撮影してください。');
                return;
            }

            this.renderModalGallery(photos);
            this.modal.style.display = 'flex';
        } catch (error) {
            console.error('写真選択エラー:', error);
            alert('写真の読み込みに失敗しました');
        }
    }

    renderModalGallery(photos) {
        this.modalGallery.innerHTML = '';

        photos.forEach(photo => {
            const card = document.createElement('div');
            card.className = 'photo-card';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <img src="${photo.data}" alt="${photo.description}">
                <div class="photo-info">
                    <small>${this.formatDate(photo.timestamp)}</small>
                </div>
            `;

            card.addEventListener('click', () => {
                this.openCamera(photo.id);
                this.closeModal();
            });

            this.modalGallery.appendChild(card);
        });
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    async openCamera(referencePhotoId = null) {
        try {
            this.currentReferencePhotoId = referencePhotoId;

            // ビューを切り替え
            this.homeView.style.display = 'none';
            this.cameraView.style.display = 'flex';

            // カメラハンドラーとオーバーレイレンダラーを初期化
            this.cameraHandler = new CameraHandler(this.videoElement);
            this.overlayRenderer = new OverlayRenderer(this.overlayCanvas);

            // カメラを起動
            await this.cameraHandler.startCamera();

            // 参照写真がある場合はオーバーレイを設定
            if (referencePhotoId) {
                const photo = await this.storage.getPhotoById(referencePhotoId);
                if (photo) {
                    await this.overlayRenderer.setReferenceImage(photo.data);
                    this.overlayRenderer.setOpacity(0.5);
                    this.overlayRenderer.startRendering(this.videoElement);
                    document.getElementById('opacityControl').style.display = 'block';
                }
            } else {
                document.getElementById('opacityControl').style.display = 'none';
            }
        } catch (error) {
            console.error('カメラ起動エラー:', error);
            alert('カメラの起動に失敗しました: ' + error.message);
            this.closeCamera();
        }
    }

    async capturePhoto() {
        try {
            const photoData = this.cameraHandler.capturePhoto();

            await this.storage.savePhoto(photoData, {
                description: '写真',
                timestamp: Date.now()
            });

            alert('写真を保存しました！');
            this.closeCamera();
            await this.loadPhotos();
        } catch (error) {
            console.error('写真撮影エラー:', error);
            alert('写真の保存に失敗しました: ' + error.message);
        }
    }

    closeCamera() {
        if (this.cameraHandler) {
            this.cameraHandler.stopCamera();
        }

        if (this.overlayRenderer) {
            this.overlayRenderer.stopRendering();
            this.overlayRenderer.clearOverlay();
        }

        this.cameraView.style.display = 'none';
        this.homeView.style.display = 'flex';
        this.currentReferencePhotoId = null;
    }

    async deletePhoto(photoId) {
        try {
            await this.storage.deletePhoto(photoId);
            await this.loadPhotos();
        } catch (error) {
            console.error('削除エラー:', error);
            alert('写真の削除に失敗しました');
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }
}

// アプリを起動
document.addEventListener('DOMContentLoaded', () => {
    new PhotoAlignmentApp();
});
