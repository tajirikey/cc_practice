// メインアプリケーションロジック
class PhotoAlignmentApp {
    constructor() {
        this.storage = new StorageManager();
        this.cameraHandler = null;
        this.overlayRenderer = null;
        this.currentReferencePhotoId = null;
        this.currentReferencePhoto = null;
        this.capturedPhotoData = null;

        // DOM要素
        this.homeView = document.getElementById('homeView');
        this.cameraView = document.getElementById('cameraView');
        this.compareView = document.getElementById('compareView');
        this.photoGallery = document.getElementById('photoGallery');
        this.videoElement = document.getElementById('videoElement');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.compareCanvas = document.getElementById('compareCanvas');
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

        // 画像アップロードボタン
        document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
            document.getElementById('photoFileInput').click();
        });

        document.getElementById('photoFileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e);
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

        // 変形コントロールボタン
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            if (this.overlayRenderer) {
                this.overlayRenderer.adjustScale(0.1);
            }
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            if (this.overlayRenderer) {
                this.overlayRenderer.adjustScale(-0.1);
            }
        });

        document.getElementById('rotateLeftBtn').addEventListener('click', () => {
            if (this.overlayRenderer) {
                this.overlayRenderer.rotate(-15);
            }
        });

        document.getElementById('rotateRightBtn').addEventListener('click', () => {
            if (this.overlayRenderer) {
                this.overlayRenderer.rotate(15);
            }
        });

        document.getElementById('resetTransformBtn').addEventListener('click', () => {
            if (this.overlayRenderer) {
                this.overlayRenderer.resetTransform();
            }
        });

        // 比較ビューのボタン
        document.getElementById('saveCompareBtn').addEventListener('click', () => {
            this.saveFromCompare();
        });

        document.getElementById('retakeBtn').addEventListener('click', () => {
            this.retakePhoto();
        });

        document.getElementById('closeCompareBtn').addEventListener('click', () => {
            this.closeCompareView();
        });

        // 比較ビューの透明度スライダー
        document.getElementById('compareOpacitySlider').addEventListener('input', async (e) => {
            const opacity = e.target.value / 100;
            document.getElementById('compareOpacityValue').textContent = e.target.value;
            await this.renderCompareView(opacity);
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

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageData = e.target.result;

                await this.storage.savePhoto(imageData, {
                    description: 'アップロード画像',
                    timestamp: Date.now(),
                    isReference: true
                });

                alert('写真をライブラリに追加しました！');
                await this.loadPhotos();
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('ファイルアップロードエラー:', error);
            alert('画像のアップロードに失敗しました');
        }

        // ファイル入力をリセット
        event.target.value = '';
    }

    async loadPhotos() {
        try {
            const { groups, ungrouped } = await this.storage.getPhotoGroups();
            this.renderGallery(groups, ungrouped);
        } catch (error) {
            console.error('写真の読み込みエラー:', error);
        }
    }

    renderGallery(groups, ungrouped) {
        this.photoGallery.innerHTML = '';

        if (groups.size === 0 && ungrouped.length === 0) {
            this.photoGallery.innerHTML = '<p class="no-photos">まだ写真がありません</p>';
            return;
        }

        // グループ化された写真を表示
        groups.forEach((photos, groupId) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'photo-group';

            const referencePhoto = photos.find(p => p.isReference);
            const capturedPhotos = photos.filter(p => !p.isReference);

            groupDiv.innerHTML = `
                <div class="photo-group-header">
                    <h3>📸 セット ${this.formatDate(photos[0].timestamp)}</h3>
                    <button class="btn btn-small btn-use-ref" data-id="${referencePhoto?.id || photos[0].id}">このセットで撮る</button>
                </div>
                <div class="photo-group-photos" id="group-${groupId}"></div>
            `;

            const photosContainer = groupDiv.querySelector(`#group-${groupId}`);

            photos.forEach(photo => {
                const card = this.createPhotoCard(photo, true);
                photosContainer.appendChild(card);
            });

            // セットで撮るボタン
            groupDiv.querySelector('.btn-use-ref').addEventListener('click', () => {
                const refId = referencePhoto?.id || photos[0].id;
                this.openCamera(refId);
            });

            this.photoGallery.appendChild(groupDiv);
        });

        // グループ化されていない写真を表示
        if (ungrouped.length > 0) {
            const ungroupedDiv = document.createElement('div');
            ungroupedDiv.className = 'photo-group';
            ungroupedDiv.innerHTML = `
                <div class="photo-group-header">
                    <h3>📁 個別の写真</h3>
                </div>
                <div class="photo-group-photos" id="ungrouped-photos"></div>
            `;

            const photosContainer = ungroupedDiv.querySelector('#ungrouped-photos');

            ungrouped.forEach(photo => {
                const card = this.createPhotoCard(photo, false);
                photosContainer.appendChild(card);
            });

            this.photoGallery.appendChild(ungroupedDiv);
        }
    }

    createPhotoCard(photo, inGroup) {
        const card = document.createElement('div');
        card.className = 'photo-card';

        const tag = photo.isReference ?
            '<span class="photo-tag reference">参照</span>' :
            '<span class="photo-tag">撮影</span>';

        card.innerHTML = `
            ${inGroup ? tag : ''}
            <img src="${photo.data}" alt="${photo.description}">
            <div class="photo-info">
                <p>${photo.description}</p>
                <small>${this.formatDate(photo.timestamp)}</small>
            </div>
            <div class="photo-actions">
                ${!inGroup ? `<button class="btn btn-small btn-use-ref" data-id="${photo.id}">参照に使う</button>` : ''}
                ${photo.groupId && !photo.isReference ? `<button class="btn btn-small btn-compare" data-id="${photo.id}">比較</button>` : ''}
                <button class="btn btn-small btn-delete" data-id="${photo.id}">削除</button>
            </div>
        `;

        // イベントリスナー
        const useRefBtn = card.querySelector('.btn-use-ref');
        if (useRefBtn) {
            useRefBtn.addEventListener('click', () => {
                this.openCamera(photo.id);
            });
        }

        const compareBtn = card.querySelector('.btn-compare');
        if (compareBtn) {
            compareBtn.addEventListener('click', async () => {
                await this.showCompareView(photo.id);
            });
        }

        card.querySelector('.btn-delete').addEventListener('click', async () => {
            if (confirm('この写真を削除しますか？')) {
                await this.deletePhoto(photo.id);
            }
        });

        return card;
    }

    async showPhotoSelector() {
        try {
            const photos = await this.storage.getPhotos();

            if (photos.length === 0) {
                alert('参照写真がありません。先に写真を撮影またはアップロードしてください。');
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

            // 参照写真を取得
            if (referencePhotoId) {
                this.currentReferencePhoto = await this.storage.getPhotoById(referencePhotoId);
            } else {
                this.currentReferencePhoto = null;
            }

            // ビューを切り替え
            this.homeView.style.display = 'none';
            this.cameraView.style.display = 'flex';

            // カメラハンドラーとオーバーレイレンダラーを初期化
            this.cameraHandler = new CameraHandler(this.videoElement);
            this.overlayRenderer = new OverlayRenderer(this.overlayCanvas);

            // カメラを起動
            await this.cameraHandler.startCamera();

            // 参照写真がある場合はオーバーレイを設定
            if (this.currentReferencePhoto) {
                await this.overlayRenderer.setReferenceImage(this.currentReferencePhoto.data);
                this.overlayRenderer.setOpacity(0.5);
                this.overlayRenderer.startRendering(this.videoElement);
                document.getElementById('opacityControl').style.display = 'block';
                document.getElementById('transformControls').style.display = 'block';
            } else {
                document.getElementById('opacityControl').style.display = 'none';
                document.getElementById('transformControls').style.display = 'none';
            }
        } catch (error) {
            console.error('カメラ起動エラー:', error);
            alert('カメラの起動に失敗しました: ' + error.message);
            this.closeCamera();
        }
    }

    async capturePhoto() {
        try {
            console.log('写真撮影開始');
            this.capturedPhotoData = this.cameraHandler.capturePhoto();
            console.log('撮影データ取得:', this.capturedPhotoData ? '成功' : '失敗');

            // 参照写真がある場合は比較ビューを表示
            if (this.currentReferencePhoto && this.currentReferencePhoto.data) {
                console.log('参照写真あり、比較ビューへ移動');
                this.closeCamera();
                await this.showCompareViewWithCapture();
            } else {
                console.log('参照写真なし、直接保存');
                // 参照写真がない場合は直接保存
                await this.storage.savePhoto(this.capturedPhotoData, {
                    description: '写真',
                    timestamp: Date.now()
                });

                alert('写真を保存しました！');
                this.closeCamera();
                await this.loadPhotos();
            }
        } catch (error) {
            console.error('写真撮影エラー:', error);
            alert('写真の保存に失敗しました: ' + error.message);
        }
    }

    async showCompareViewWithCapture() {
        this.homeView.style.display = 'none';
        this.cameraView.style.display = 'none';
        this.compareView.style.display = 'flex';

        // 比較ビューを描画
        await this.renderCompareView(0.5);
    }

    async showCompareView(photoId) {
        try {
            const photo = await this.storage.getPhotoById(photoId);
            if (!photo || !photo.groupId) {
                alert('この写真は比較できません');
                return;
            }

            const groupPhotos = await this.storage.getPhotosByGroupId(photo.groupId);
            const referencePhoto = groupPhotos.find(p => p.isReference);

            if (!referencePhoto) {
                alert('参照写真が見つかりません');
                return;
            }

            this.currentReferencePhoto = referencePhoto;
            this.capturedPhotoData = photo.data;

            this.homeView.style.display = 'none';
            this.compareView.style.display = 'flex';

            await this.renderCompareView(0.5);
        } catch (error) {
            console.error('比較ビュー表示エラー:', error);
            alert('比較ビューの表示に失敗しました');
        }
    }

    async renderCompareView(opacity) {
        console.log('renderCompareView開始, opacity:', opacity);

        if (!this.currentReferencePhoto || !this.currentReferencePhoto.data) {
            console.error('参照写真がありません');
            alert('参照写真がありません');
            return;
        }

        if (!this.capturedPhotoData) {
            console.error('撮影データがありません');
            alert('撮影データがありません');
            return;
        }

        const canvas = this.compareCanvas;
        const ctx = canvas.getContext('2d');

        console.log('キャンバス要素:', canvas);
        console.log('参照写真データ長:', this.currentReferencePhoto.data.length);
        console.log('撮影データ長:', this.capturedPhotoData.length);

        try {
            console.log('画像読み込み開始');
            // 両方の画像を読み込む
            const [refImg, capturedImg] = await Promise.all([
                this.loadImage(this.currentReferencePhoto.data),
                this.loadImage(this.capturedPhotoData)
            ]);

            console.log('画像読み込み完了');
            console.log('参照画像サイズ:', refImg.width, 'x', refImg.height);
            console.log('撮影画像サイズ:', capturedImg.width, 'x', capturedImg.height);

            // キャンバスサイズを参照画像に合わせる
            canvas.width = refImg.width;
            canvas.height = refImg.height;

            console.log('キャンバスサイズ設定:', canvas.width, 'x', canvas.height);

            // キャンバスをクリア
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 参照画像を描画
            ctx.drawImage(refImg, 0, 0);
            console.log('参照画像描画完了');

            // 撮影画像を半透明で重ねる
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.drawImage(capturedImg, 0, 0, canvas.width, canvas.height);
            ctx.restore();
            console.log('撮影画像描画完了');

        } catch (error) {
            console.error('比較ビューの描画エラー:', error);
            alert('画像の表示に失敗しました: ' + error.message);
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
            img.src = src;
        });
    }

    async saveFromCompare() {
        try {
            // データの存在確認
            if (!this.capturedPhotoData) {
                throw new Error('撮影データがありません');
            }

            if (!this.currentReferencePhoto) {
                throw new Error('参照写真がありません');
            }

            // グループIDを生成または既存のものを使用
            let groupId = this.currentReferencePhoto.groupId;

            if (!groupId) {
                groupId = this.storage.generateGroupId();

                // 参照写真にグループIDを追加（既存の写真を更新）
                // IndexedDBでは直接更新が必要
                await this.updatePhotoGroupId(this.currentReferencePhoto.id, groupId, true);
            }

            // 撮影した写真を保存
            await this.storage.savePhoto(this.capturedPhotoData, {
                description: '撮影写真',
                timestamp: Date.now(),
                groupId: groupId,
                isReference: false
            });

            alert('写真を保存しました！');
            this.closeCompareView();
            await this.loadPhotos();
        } catch (error) {
            console.error('保存エラー:', error);
            alert('写真の保存に失敗しました: ' + error.message);
        }
    }

    async updatePhotoGroupId(photoId, groupId, isReference) {
        // 既存の写真を取得
        const photo = await this.storage.getPhotoById(photoId);
        if (!photo) return;

        // 写真を削除して再保存
        await this.storage.deletePhoto(photoId);
        await this.storage.savePhoto(photo.data, {
            description: photo.description,
            timestamp: photo.timestamp,
            groupId: groupId,
            isReference: isReference
        });
    }

    retakePhoto() {
        this.closeCompareView();
        this.openCamera(this.currentReferencePhotoId);
    }

    closeCompareView() {
        // キャンバスをクリア
        if (this.compareCanvas) {
            const ctx = this.compareCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.compareCanvas.width, this.compareCanvas.height);
        }

        this.compareView.style.display = 'none';
        this.homeView.style.display = 'flex';
        this.capturedPhotoData = null;
        this.currentReferencePhoto = null;
        this.currentReferencePhotoId = null;
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
        this.currentReferencePhoto = null;
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
