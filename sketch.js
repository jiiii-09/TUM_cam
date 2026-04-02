let video;
let prevFrame;
let threshold = 30;
let circles = [];

let camShader;
let shaderBuffer; // shader용 p5.Graphics

let grayShader;
let grayBuffer;

function preload() {
  camShader = loadShader("shaders/cam.vert", "shaders/cam.frag");
  grayShader = loadShader("shaders/cam.vert", "shaders/gray.frag"); // ⭐ 추가
}

function setup() {
  pixelDensity(1);
frameRate(30);
  createCanvas(windowWidth, windowHeight);
   // 🔥 최적화된 캔버스 사이즈

  // 비디오도 동일하게 더 저해상도로
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  // shaderBuffer 역시 video 해상도 맞추기
shaderBuffer = createGraphics(320, 240, WEBGL);
grayBuffer = createGraphics(320, 240, WEBGL); // ⭐ 추가
}

function draw() {
  background(0);

  // ------------------------------------------
  // ⭐ 1) COVER 방식으로 카메라 확대하기
  // ------------------------------------------
  let scaleFactor = max(width / video.width, height / video.height);
  let drawW = video.width * scaleFactor;
  let drawH = video.height * scaleFactor;
  let offsetX = (width - drawW) / 2;
  let offsetY = (height - drawH) / 2;

  // ------------------------------------------
  // ⭐ 2) 흑백 비디오 레이어 (좌우반전 + cover)
  // ------------------------------------------
  grayBuffer.shader(grayShader);
grayShader.setUniform("u_tex0", video);

grayBuffer.push();
grayBuffer.clear();

grayBuffer.beginShape();
grayBuffer.vertex(-1, -1, 0, 0);
grayBuffer.vertex( 1, -1, 1, 0);
grayBuffer.vertex( 1,  1, 1, 1);
grayBuffer.vertex(-1,  1, 0, 1);
grayBuffer.endShape();

grayBuffer.pop();
  
 push();
translate(width, 0);
scale(-1, 1);
image(grayBuffer, offsetX, offsetY, drawW, drawH); // ⭐ video → grayBuffer
pop();

  // ------------------------------------------
  // ⭐ 3) 움직임 감지 (원래 로직 그대로)
  // ------------------------------------------
  video.loadPixels();

if (prevFrame) {
  detectMovement();
}

prevFrame = [];

for (let y = 0; y < video.height; y += 30) {
  for (let x = 0; x < video.width; x += 30) {
    let i = (y * video.width + x) * 4;
    prevFrame.push(video.pixels[i]);
  }
}

  // ------------------------------------------
  // ⭐ 4) erase() 구멍 효과
  // ------------------------------------------
  push();
  erase();
 for (let i = circles.length - 1; i >= 0; i--) {

  let c = circles[i];
  circle(c.x, c.y, c.size);
  c.life -= 10;

  if (c.life <= 0) circles.splice(i,1);
}
  noErase();
  pop();

  // ------------------------------------------
  // ⭐ 5) 열화상 레이어 GPU 렌더링
  // ------------------------------------------
  shaderBuffer.shader(camShader);
  camShader.setUniform("u_tex0", video);

  shaderBuffer.push();
  shaderBuffer.clear();

  // WEBGL: -1 ~ 1 전체 화면
  shaderBuffer.beginShape();
  shaderBuffer.vertex(-1, -1, 0, 0);
  shaderBuffer.vertex( 1, -1, 1, 0);
  shaderBuffer.vertex( 1,  1, 1, 1);
  shaderBuffer.vertex(-1,  1, 0, 1);
  shaderBuffer.endShape();
  shaderBuffer.pop();

  // ------------------------------------------
  // ⭐ 6) 열화상을 cover 영상 뒤에 깔기
  //     (destination-over → 배경 레이어)
  //     + 좌우반전 + 상하반전 그대로 유지
  // ------------------------------------------
  push();
  drawingContext.save();
  drawingContext.globalCompositeOperation = "destination-over";

  translate(width, 0);
  scale(-1, 1);

  scale(1, -1);
  translate(0, -height);

  image(shaderBuffer, offsetX, offsetY, drawW, drawH);  // cover 적용 ★

  drawingContext.restore();
  pop();
}

function detectMovement() {

  let index = 0; // ⭐ prevFrame용 인덱스

  for (let y = 0; y < video.height; y += 30) {
    for (let x = 0; x < video.width; x += 30) {

      let i = (y * video.width + x) * 4;

      let diff = abs(video.pixels[i] - prevFrame[index]);

      if (diff > threshold) {

        let realX = map(x, 0, video.width, 0, width);
        let realY = map(y, 0, video.height, 0, height);

        if (isFarEnough(realX, realY, 120)) {
          circles.push({
            x: realX,
            y: realY,
            life: 255,
            size: 180
          });
        }
      }

      index++; // ⭐ 이거 중요
    }
  }
}

function isFarEnough(x, y, minDist) {
  for (let c of circles) {
    if (dist(x, y, c.x, c.y) < minDist) return false;
  }
  return true;
}
