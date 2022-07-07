# Image-to-video-converter-js
Image to video conversion tool that runs in pure javascript.

# Usage
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
        a.download = `recording.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    });
    Image2Video.convert();
});
```
