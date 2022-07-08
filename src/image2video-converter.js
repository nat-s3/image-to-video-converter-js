
const Image2Video = (function () {
    let recordingState = false;
    let recoder;
    let frames = [];

    let canvas;
    let ctx;

    let onLoad = null;
    let onProgress = null;
    let onFinish = null;

    let nextDuration = null;
    let maxLimit = 3840;
    let minLimit = 2160;

    /**
     * 初期化を行う
     * @returns void
     */
    function init() {
        if (recordingState == true) {
            console.warn('convert実行中に呼び出さないでください');
            return;
        }
        canvas = document.createElement("canvas");
    }

    /**
     * 現在、変換中かを調べる
     * @returns boolean
     */
    function getRecordState() {
        return recordingState;
    }
    /**
     * loadImageによる画像の読み込みが終了した場合に呼び出されるCallBackを設定する
     * @param {Function} fn 
     * @returns void
     */
    function setOnLoad(fn) {
        if (recordingState == true) {
            console.warn('convert実行中に呼び出さないでください');
            return;
        }
        if (isFunction(fn)) {
            onLoad = fn;
        } else {
            onLoad = null;
        }
    }
    /**
     * 動画への変換の進捗によって呼び出されるCallBackを設定する
     * @param {(percent: double) => void} fn 
     * @returns void
     */
    function setProgress(fn) {
        if (recordingState == true) {
            console.warn('convert実行中に呼び出さないでください');
            return;
        }
        if (isFunction(fn)) {
            onProgress = fn;
        } else {
            onProgress = null;
        }
    }
    /**
     * loadImageによる画像の読み込みが終了した場合に呼び出されるCallBackを設定する
     * @param {(data: Blob?, fileExtention: string?) => void} fn 
     * @returns void
     */
    function setOnFinish(fn) {
        if (recordingState == true) {
            console.warn('convert実行中に呼び出さないでください');
            return;
        }
        if (isFunction(fn)) {
            onFinish = fn;
        } else {
            onFinish = null;
        }
    }
    /**
     * 動画変換時の画像切り替え間隔の設定
     * @param {number?} duration milliseconds
     * @returns void
     */
    function setFrameDuration(duration) {
        if (recordingState == true) {
            console.warn('convert実行中に呼び出さないでください');
            return;
        }
        const data = Number.parseInt(duration);
        if (isNaN(data)) {
            nextDuration = null;
        } else {
            nextDuration = data;
        }
    }

    /**
     * 動画変換対象の画像を読み込む
     * @param {[File]} files 
     * @returns void
     */
    function loadImage(files) {
        if (recordingState == true) {
            console.warn('convert実行中に呼び出さないでください');
            return;
        }
        for (let i = 0; i < frames.length; i++) {
            const work = frames[i].src;
            frames[i].onload = null;
            frames[i].src = '';
            URL.revokeObjectURL(work);
        }
        frames = [];
        let preFrames = [];
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            reader.onload = () => {
                const tag = document.createElement("img");
                tag.onload = () => {
                    preFrames.push({ index: i, element: tag });
                    if (preFrames.length == files.length) {
                        frames = preFrames.sort((a, b) => a.index - b.index).map((v, i, ary) => v.element);
                        if (isFunction(onLoad)) {
                            onLoad();
                        }
                    }
                }
                tag.src = reader.result;
            }
            reader.readAsDataURL(files[i]);
        }
    }

    /**
     * 画像から動画への変換を実行する
     * @returns void
     */
    function convert() {
        if (recordingState == true) {
            console.warn('convert実行中に再度呼び出さないでください');
            return;
        }
        if (frames.length == 0) {
            console.warn('対象の画像がありません。loadImageを先に呼び出してください');
            return;
        }
        if (canvas == null) {
            console.warn('initを先に呼び出してください');
            return;
        }
        recordingState = true;
        console.log(canvas);

        canvas.width = (frames[0].width ?? frames[0].naturalWidth ?? frames[0].clientWidth);
        canvas.height = (frames[0].height ?? frames[0].naturalHeight ?? frames[0].clientHeight ?? console.log('なぜかnull'));

        if (Math.max(canvas.width, canvas.height) > maxLimit && (canvas.width * canvas.height) > maxLimit * minLimit) {
            let rate = 1 / (Math.max(canvas.width, canvas.height) / maxLimit);
            canvas.width  *= rate;
            canvas.height *= rate;
        }
        if (Math.min(canvas.width, canvas.height) > minLimit && (canvas.width * canvas.height) > maxLimit * minLimit) {
            let rate = 1 / (Math.min(canvas.width, canvas.height) / minLimit);
            canvas.width  *= rate;
            canvas.height *= rate;
        }


        ctx = canvas.getContext("2d");


        const stream = canvas.captureStream();
        const mimeTypes = [
            "video/webm\;codecs=h264",
            "video/webm",
            "video/webm\;codecs=vp8",
            "video/webm\;codecs=daala",
            "audio/webm\;codecs=opus",
            "video/mpeg",
        ];
        let targetMimeType = null;
        for (let i = 0; i < mimeTypes.length; i++) {
            if (MediaRecorder.isTypeSupported(mimeTypes[i])) {
                targetMimeType = mimeTypes[i];
                break;
            }
        }
        if (targetMimeType == null) {
            console.error('このブラウザで利用可能なMIME-TYPEがありません');
            return;
        }
        recoder = new MediaRecorder(stream, {
            mimeType: targetMimeType,
            ignoreMutedMedia: true
        });
        recoder.ondataavailable = event => {
            if (event.data.size > 0) {
                const blob = new Blob([event.data], {
                    type: event.data.type,
                });
                const typeIndex = event.data.type.lastIndexOf('/');
                let typeLastIndex = event.data.type.lastIndexOf(';');
                if (typeLastIndex == -1) {
                    typeLastIndex = null;
                }
                if (isFunction(onFinish)) {
                    onFinish(blob, 'webm');
                }
            } else {
                if (isFunction(onFinish)) {
                    onFinish(null, null);
                }
            }
            recordingState = false;
            delete recoder;
            recoder = null;
        };
        recoder.start();
        viewFrame();
    }

    /**
     * canvasへの画像書き込みを行う
     * @param {number} frame_no 
     */
    function viewFrame(frame_no = -1) {
        frame_no++;
        if (isFunction(onProgress)) {
            onProgress(frame_no / frames.length);
        }
        if (frames[frame_no]) {
            ctx.drawImage(frames[frame_no], 0, 0);
            setTimeout(() => viewFrame(frame_no), nextDuration ?? 500);
        } else if (recoder != null) {
            recoder.stop();
        }
    }

    function isFunction(fn) {
        return fn && typeof fn === 'function';
    }


    return {
        init: init,
        getRecordState: getRecordState,
        loadImages: loadImage,
        setOnLoad: setOnLoad,
        setOnProgress: setProgress,
        setOnFinish: setOnFinish,
        setFrameDuration: setFrameDuration,
        setMaxLimit: (v) => {
            const maxData = Number.parseInt(v);
            if (!isNaN(maxData)) {
                maxLimit = maxData;
            }
        },
        setMinLimit: (v) => {
            const minData = Number.parseInt(v);
            if (!isNaN(minData)) {
                minLimit = minData;
            }
        },
        convert: convert,
        canvas: () => canvas,
        deinit: () => {
            recordingState = false;

            if (recoder != null) {
                delete recoder;
                recoder = null;
            }

            for (let i = 0; i < frames.length; i++) {
                const work = frames[0].src;
                frames[0].onload = null;
                frames[0].src = '';
                URL.revokeObjectURL(work);
            }
            frames = [];
            ctx = null;
            canvas = null;
            onLoad = null;
            onProgress = null;
            onFinish = null;
        },
    };
})();
