# Image-to-video-converter-js
Image to video conversion tool that runs in pure javascript.

## Installation
add HTML
```html
<script src="https://nat-s3.github.io/image-to-video-converter-js/src/image2video-converter.min.js" type="text/javascript"></script>
```

## Usage
```js
// Create UI
const html = document.querySelector('html');
html.innerHTML = '';

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.multiple = true;
html.appendChild(fileInput);

const recordButton = document.createElement('button');
recordButton.innerHTML = 'tryRecord';
html.appendChild(recordButton);


// Core Logic
fileInput.addEventListener('change', (e) => {
    Image2Video.setOnLoad(() => console.log('loaded'));
    Image2Video.loadImages(fileInput.files);
});
recordButton.addEventListener('click', () => {
    Image2Video.setOnProgress(
        (progress) => console.log(
            `progress: ${Math.round(progress * 100)} %`
        )
    );
    Image2Video.setOnFinish((blob, ext) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convert_result.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    });
    Image2Video.convert();
});
```

----

## Function Reference

### `init()`
### `getRecordState()`
### `loadImages()`
### `convert()`
### `setOnLoad(callback)`
### `setOnProgress((number) => {})`
### `setOnFinish((blob, fileExtention) => {})`
### `setOnLog((map) => {})`
### `setFrameDuration(number)`
### `setMaxLimit(number)`
### `setMinLimit(number)`
### `setCaptureRate(number)`
### `setLogicDefault()`
    Default mode is PrioritySize.

### `setLogicPrioritySize()`
    Set to the method to adjust image size

### `setLogicPriorityFast()`
    Set to a simple processing method

### `canvas()`
