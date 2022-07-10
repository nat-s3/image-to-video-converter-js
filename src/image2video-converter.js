const Image2Video = (function () {
    let recordingLogicType = 1;

    let recordingState = false;
    let retryCount = 0;
    let captureRate = null;
    let recoder = null;
    let frames = [];

    let preCanvas = [];
    let onceBack = false;

    let canvas = null;
    let ctx = null;
    let rawCanvas = null;
    let rawCtx = null;

    let onLoad = null;
    let onProgress = null;
    let onFinish = null;
    let onLog = null;

    let nextDuration = null;
    let maxLimit = 3840;
    let minLimit = 2160;

    /**
     * Perform initialization
     * @returns void
     */
    function init() {
        if (guard()) {
            return;
        }
        canvas = document.createElement("canvas");
        rawCanvas = document.createElement("canvas");
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
        rawCtx = null;
        onLoad = null;
        onProgress = null;
        onFinish = null;
        onLog = null;
        retryCount = 0;
        maxLimit = 3840;
        minLimit = 2160;
        captureRate = null;
        preCanvas = [];
        onceBack = false;
    }


    /**
     * Find out if a conversion is currently in progress.
     * @returns boolean
     */
    function getRecordState() {
        return recordingState;
    }


    /**
     * Sets CallBack to be called when image loading by loadImage finishes
     * @param {Function} fn 
     * @returns void
     */
    function setOnLoad(fn) {
        if (guard()) {
            return;
        }
        if (isFunction(fn)) {
            onLoad = fn;
        } else {
            onLoad = null;
        }
    }


    /**
     * Set CallBack to be called by the progress of conversion to video
     * @param {(percent: double) => void} fn 
     * @returns void
     */
    function setProgress(fn) {
        if (guard()) {
            return;
        }
        if (isFunction(fn)) {
            onProgress = fn;
        } else {
            onProgress = null;
        }
    }


    /**
     * Sets CallBack to be called when image loading by loadImage finishes
     * @param {(data: Blob?, fileExtention: string?) => void} fn 
     * @returns void
     */
    function setOnFinish(fn) {
        if (guard()) {
            return;
        }
        if (isFunction(fn)) {
            onFinish = fn;
        } else {
            onFinish = null;
        }
    }


    /**
     * Set up callbacks to receive messages as they occur
     * @param {() => void} fn 
     */
    function setOnLog(fn) {
        if (isFunction(fn)) {
            onLog = fn;
        } else {
            onLog = null;
        }
    }


    /**
     * Limit maximum output size
     * @param {Number} v
     */
    function setMaxLimit(v) {
        if (guard()) {
            return;
        }
        const maxData = Number.parseInt(v);
        if (!isNaN(maxData)) {
            maxLimit = maxData;
        }
    }


    /**
     * Limit minimum output size
     * @param {Number} v
     * @returns 
     */
    function setMinLimit(v) {
        if (guard()) {
            return;
        }
        const minData = Number.parseInt(v);
        if (!isNaN(minData)) {
            minLimit = minData;
        }
    }


    /**
     * Setting the frame rate in MediaRecorder
     * @param {Number?} v 
     * @returns 
     */
    function setCaptureRate(v) {
        if (guard()) {
            return;
        }
        const rate = Number.parseFloat(v);
        if (!isNaN(rate)) {
            captureRate = rate;
        } else {
            captureRate = null;
        }
    }


    /**
     * Setting of image switching interval during video conversion
     * @param {number?} duration milliseconds
     * @returns void
     */
    function setFrameDuration(duration) {
        if (guard()) {
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
     * Load images to be converted to video
     * @param {[File]} files 
     * @returns void
     */
    function loadImage(files) {
        if (guard()) {
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
                        f(onLoad);
                    }
                }
                tag.src = reader.result;
            }
            reader.readAsDataURL(files[i]);
        }
    }


    /**
     * Perform image to video conversion
     * @returns void
     */
    function convert() {
        if (guard()) {
            return;
        }
        if (frames.length == 0) {
            f(onLog, [{ level: 'warn', message: 'No target image, please call loadImage first' }]);
            console.warn('No target image, please call loadImage first');
            return;
        }
        if (canvas == null) {
            f(onLog, [{ level: 'warn', message: 'Please call init first' }]);
            console.warn('Please call init first');
            return;
        }
        console.info(`Logic : ${(recordingLogicType == 1) ? 'PrioritySize' : 'PriorityFast'}`);

        recordingState = true;

        rawCanvas.width = (frames[0].width ?? frames[0].naturalWidth ?? frames[0].clientWidth ?? 1);
        rawCanvas.height = (frames[0].height ?? frames[0].naturalHeight ?? frames[0].clientHeight ?? 1);

        canvas.width = rawCanvas.width;
        canvas.height = rawCanvas.height;

        if (Math.max(canvas.width, canvas.height) > maxLimit && (canvas.width * canvas.height) > maxLimit * minLimit) {
            let rate = 1 / (Math.max(canvas.width, canvas.height) / maxLimit);
            canvas.width *= rate;
            canvas.height *= rate;
        }
        if (Math.min(canvas.width, canvas.height) > minLimit && (canvas.width * canvas.height) > maxLimit * minLimit) {
            let rate = 1 / (Math.min(canvas.width, canvas.height) / minLimit);
            canvas.width *= rate;
            canvas.height *= rate;
        }

        f(onLog, [{ level: 'info', message: `OutputVideoSize: (${canvas.height}, ${canvas.width})` }]);


        preCanvas = [];
        if (recordingLogicType == 1) {
            for (let i = 0; i < frames.length; i++) {
                let canv = document.createElement("canvas");
                canv.width = (frames[i].width ?? frames[i].naturalWidth ?? frames[i].clientWidth ?? 1);
                canv.height = (frames[i].height ?? frames[i].naturalHeight ?? frames[i].clientHeight ?? 1);
                let ctx = canv.getContext("2d");
                ctx.drawImage(frames[i], 0, 0);
                canv = resize(canvas, canv);
                preCanvas[i] = { canvas: canv, ctx: canv.getContext('2d') };
            }
        } else if (recordingLogicType == 0) {
            rawCtx = rawCanvas.getContext("2d");
        }

        ctx = canvas.getContext("2d");
        retryCount = 1;

        startRecord();
    }


    /**
     * Start shooting
     * @returns void
     */
    function startRecord() {
        if (retryCount < 0) {
            f(onLog, [{ level: 'error', message: 'Conversion failed' }]);
            console.error('Conversion failed');
            recordingState = false;
            retryCount = 0;
            f(onFinish, [null, null]);
            return;
        }

        const stream = (captureRate == null) ? canvas.captureStream() : canvas.captureStream(captureRate);
        const mimeTypes = [
            "video/webm\;codecs=h264",
            "video/webm\;codecs=vp8",
            "video/webm\;codecs=daala",
            "video/webm",
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
            f(onLog, [{ level: 'error', message: 'No MIME-TYPE available for this browser' }]);
            console.error('No MIME-TYPE available for this browser');
            return;
        }
        if (recoder != null) {
            delete recoder;
            recoder = null;
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
                f(onFinish, [blob, 'webm']);
                recordingState = false;
                delete recoder;
                recoder = null;
            } else {
                delete recoder;
                recoder = null;
                retryCount--;
                if (frames.length == 1) {
                    frames = [frames[0], frames[0]];
                }
                startRecord();
            }
        };
        recoder.onerror = (event) => {
            console.error(`error recording stream: ${event.error.name}`)
        };
        recoder.start();

        if (recordingLogicType == 1) {
            viewFramePrioritySize();
        } else {
            viewFrameDefault();
        }
    }


    /**
     * Writing images to canvas
     * @param {number} frame_no 
     */
    function viewFrameDefault(frame_no = -1) {
        frame_no++;
        f(onProgress, [frame_no / frames.length]);
        if (frames[frame_no]) {
            rawCtx.drawImage(frames[frame_no], 0, 0);

            ctx.drawImage(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height, 0, 0, canvas.width, canvas.height);

            setTimeout(() => viewFrameDefault(frame_no), nextDuration ?? 500);
        } else if (recoder != null) {
            recoder.stop();
        }
    }


    /**
     * Writing images to canvas
     */
    function viewFramePrioritySize(frame_no = -1) {
        let draw = () => {
            if (preCanvas[frame_no]) {
                let w = preCanvas[frame_no].canvas.width;
                let h = preCanvas[frame_no].canvas.height;
                let rW = (canvas.width - w) / 2;
                let rH = (canvas.height - h) / 2;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                let x = 0;
                if (!onceBack) {
                    onceBack = true;
                    x = 1;
                }
                ctx.drawImage(preCanvas[frame_no].canvas, x, 0, w, h, rW, rH, w, h);
                return false;
            } else {
                onceBack = false;
                recoder.stop();
                return true;
            }
        }

        frame_no++;
        let duration = nextDuration ?? 500;
        let prefState = onceBack;

        if (onceBack) f(onProgress, [frame_no / frames.length]);
        if (draw()) return;
        if (onceBack != prefState) {
            frame_no--;
            duration = 0;
        }

        setTimeout(() => viewFramePrioritySize(frame_no), duration);
    }


    /**
     * Resize/copy the canvas
     * @param {HTMLCanvasElement} targetCanvas 
     * @param {HTMLCanvasElement} srcCanvas 
     */
    function resize(targetCanvas, srcCanvas) {
        let wRate = srcCanvas.width / targetCanvas.width;
        let hRate = srcCanvas.height / targetCanvas.height;
        if (wRate == 1 && hRate == 1) {
            return srcCanvas;
        }
        let canv = document.createElement("canvas");
        canv.width = srcCanvas.width;
        canv.height = srcCanvas.height;
        if (wRate != 1) {
            let rate = 1 / wRate;
            canv.width *= rate;
            canv.height *= rate;
        }
        wRate = canv.width / targetCanvas.width;
        hRate = canv.height / targetCanvas.height;
        if (hRate != 1) {
            let rate = 1 / hRate;
            canv.width *= rate;
            canv.height *= rate;
        }
        let context = canv.getContext('2d');
        context.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, canv.width, canv.height);
        return canv;
    }


    /**
     * @param {any} fn 
     * @returns 
     */
    function isFunction(fn) {
        return fn && typeof fn === 'function';
    }


    /**
     * Safely execute function objects
     * @param {any} fn 
     * @param {Array?} args 
     * @returns function result
     */
    function f(fn, args = null) {
        if (isFunction(fn)) {
            try {
                if (args == null) {
                    return fn();
                } else if (args instanceof Array) {
                    switch (args.length) {
                        case 1:
                            return fn(args[0]);
                        case 2:
                            return fn(args[0], args[1]);
                        default:
                            return fn();
                    }
                }
            } catch (error) {
                if (isFunction(onLog)) {
                    onLog({ level: 'error', message: `${error.name} | ${error.message} | ${error.stack}` });
                    console.error(error);
                }
            }
        }
        return null;
    }

    /**
     * Confirmation that it is acceptable to perform
     * @returns {boolean} true is enable guard
     */
    function guard() {
        if (recordingState == true) {
            f(onLog, [{ level: 'warn', message: 'Do not call while convert is running' }]);
            console.warn('Do not call while convert is running');
            return true;
        }
        return false;
    }

    return {
        init: init,
        getRecordState: getRecordState,
        loadImages: loadImage,
        setOnLoad: setOnLoad,
        setOnProgress: setProgress,
        setOnFinish: setOnFinish,
        setOnLog: setOnLog,
        setFrameDuration: setFrameDuration,
        setMaxLimit: setMaxLimit,
        setMinLimit: setMinLimit,
        setCaptureRate: setCaptureRate,
        setLogicDefault: () => recordingLogicType = 1,
        setLogicPrioritySize: () => recordingLogicType = 1,
        setLogicPriorityFast: () => recordingLogicType = 0,
        convert: convert,
        canvas: () => canvas,
    };
})();
